using Celebri.Dominio.Eventos;
using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Fornecedores;
using Celebri.Dominio.Isolamento;

namespace Celebri.Dominio.Cronogramas;

public class ItemModeloCronograma : IPertenceOrganizacao
{
    public const string CampoMinutos = "minutosDesdeCerimonia";
    public const string CampoReferenciaLocal = "referenciaLocal";
    public const string CampoCategoriaFornecedor = "categoriaFornecedor";

    private ItemModeloCronograma()
    {
        Atividade = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid ModeloId { get; private set; }

    public int MinutosDesdeCerimonia { get; private set; }

    public int? DuracaoMinutos { get; private set; }

    public string Atividade { get; private set; }

    public ReferenciaLocalCronograma? ReferenciaLocal { get; private set; }

    public string? Local { get; private set; }

    public string? Responsavel { get; private set; }

    public CategoriaFornecedor? CategoriaFornecedor { get; private set; }

    public string? Instrucoes { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public static bool MinutosValidos(int minutos)
    {
        return minutos is >= -ItemCronograma.MinutosRelativosMaximo and <= ItemCronograma.MinutosRelativosMaximo;
    }

    public int PosicaoNaCerimonia(TimeOnly horarioCerimonia)
    {
        return ItemCronograma.PosicaoRelativaACerimonia(horarioCerimonia, MinutosDesdeCerimonia);
    }

    public bool ForaDaJanela(TimeOnly horarioCerimonia)
    {
        return ItemCronograma.ForaDaJanela(horarioCerimonia, MinutosDesdeCerimonia);
    }

    public string? ResolverLocal(Evento evento)
    {
        ArgumentNullException.ThrowIfNull(evento);

        return ReferenciaLocal switch
        {
            ReferenciaLocalCronograma.Cerimonia => evento.LocalCerimonia,
            ReferenciaLocalCronograma.Recepcao => evento.LocalRecepcao,
            _ => Local,
        };
    }

    public DadosItemCronograma ParaDadosItem(Evento evento, TimeOnly horarioCerimonia, Guid? fornecedorEventoId)
    {
        var (dia, inicio) = ItemCronograma.DePosicao(PosicaoNaCerimonia(horarioCerimonia));
        var local = ResolverLocal(evento);

        if (local is { Length: > ItemCronograma.TamanhoMaximoLocal })
        {
            local = local[..ItemCronograma.TamanhoMaximoLocal];
        }

        return new DadosItemCronograma(dia, inicio, DuracaoMinutos, Atividade, local, Responsavel, fornecedorEventoId, Instrucoes, null);
    }

    internal static ItemModeloCronograma Criar(Guid modeloId, DadosItemModeloCronograma dados, DateTimeOffset agora)
    {
        var item = new ItemModeloCronograma
        {
            Id = Guid.NewGuid(),
            ModeloId = modeloId,
            CriadoEm = agora,
        };

        item.Aplicar(dados, agora);
        return item;
    }

    internal void Atualizar(DadosItemModeloCronograma dados, DateTimeOffset agora)
    {
        Aplicar(dados, agora);
    }

    private void Aplicar(DadosItemModeloCronograma dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        if (!MinutosValidos(dados.MinutosDesdeCerimonia))
        {
            throw new RegraNegocioException(MensagensModeloCronograma.ForaDaJanela, CampoMinutos);
        }

        var atividade = NormalizadorTexto.Normalizar(dados.Atividade)
            ?? throw new RegraNegocioException(MensagensCronograma.AtividadeObrigatoria, ItemCronograma.CampoAtividade);

        if (atividade.Length is < ItemCronograma.TamanhoMinimoAtividade or > ItemCronograma.TamanhoMaximoAtividade)
        {
            throw new RegraNegocioException(MensagensCronograma.TamanhoAtividade, ItemCronograma.CampoAtividade);
        }

        if (dados.DuracaoMinutos is < ItemCronograma.DuracaoMinima or > ItemCronograma.DuracaoMaxima)
        {
            throw new RegraNegocioException(MensagensCronograma.DuracaoInvalida, ItemCronograma.CampoDuracao);
        }

        if (dados.ReferenciaLocal is { } referencia && !Enum.IsDefined(referencia))
        {
            throw new RegraNegocioException(MensagensModeloCronograma.ReferenciaLocalInvalida, CampoReferenciaLocal);
        }

        if (dados.CategoriaFornecedor is { } categoria && !Enum.IsDefined(categoria))
        {
            throw new RegraNegocioException(MensagensModeloCronograma.CategoriaInvalida, CampoCategoriaFornecedor);
        }

        var local = dados.ReferenciaLocal is null
            ? NormalizarOpcional(dados.Local, ItemCronograma.TamanhoMaximoLocal, MensagensCronograma.TamanhoLocal, ItemCronograma.CampoLocal)
            : null;
        var responsavel = NormalizarOpcional(
            dados.Responsavel,
            ItemCronograma.TamanhoMaximoResponsavel,
            MensagensCronograma.TamanhoResponsavel,
            ItemCronograma.CampoResponsavel);
        var instrucoes = string.IsNullOrWhiteSpace(dados.Instrucoes) ? null : dados.Instrucoes.Trim();

        if (instrucoes is { Length: > ItemCronograma.TamanhoMaximoTexto })
        {
            throw new RegraNegocioException(MensagensCronograma.TamanhoTexto, ItemCronograma.CampoInstrucoes);
        }

        MinutosDesdeCerimonia = dados.MinutosDesdeCerimonia;
        DuracaoMinutos = dados.DuracaoMinutos;
        Atividade = atividade;
        ReferenciaLocal = dados.ReferenciaLocal;
        Local = local;
        Responsavel = responsavel;
        CategoriaFornecedor = dados.CategoriaFornecedor;
        Instrucoes = instrucoes;
        AtualizadoEm = agora;
    }

    private static string? NormalizarOpcional(string? valor, int tamanhoMaximo, string mensagem, string campo)
    {
        var normalizado = NormalizadorTexto.Normalizar(valor);

        if (normalizado is { Length: var tamanho } && tamanho > tamanhoMaximo)
        {
            throw new RegraNegocioException(mensagem, campo);
        }

        return normalizado;
    }
}
