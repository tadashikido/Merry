using Casamento.Dominio.Convidados;
using Casamento.Dominio.Excecoes;
using Casamento.Dominio.Isolamento;

namespace Casamento.Dominio.Cronogramas;

public class ItemCronograma : IPertenceCasamento
{
    public const int TamanhoMinimoAtividade = 2;
    public const int TamanhoMaximoAtividade = 160;
    public const int TamanhoMaximoLocal = 200;
    public const int TamanhoMaximoResponsavel = 120;
    public const int TamanhoMaximoTexto = 2000;
    public const int DuracaoMinima = 5;
    public const int DuracaoMaxima = 1440;
    public const int LimitePorCasamento = 200;
    public const int MinutosPorDia = 1440;
    public const int PosicaoMinima = -MinutosPorDia;
    public const int PosicaoMaxima = (2 * MinutosPorDia) - 1;
    public const int MinutosRelativosMaximo = PosicaoMaxima;
    public const string CampoDia = "dia";
    public const string CampoInicio = "inicio";
    public const string CampoDuracao = "duracaoMinutos";
    public const string CampoAtividade = "atividade";
    public const string CampoLocal = "local";
    public const string CampoResponsavel = "responsavel";
    public const string CampoFornecedor = "fornecedorCasamentoId";
    public const string CampoInstrucoes = "instrucoes";
    public const string CampoNotasInternas = "notasInternas";

    private ItemCronograma()
    {
        Atividade = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid CasamentoId { get; private set; }

    public DiaCronograma Dia { get; private set; }

    public TimeOnly Inicio { get; private set; }

    public int? DuracaoMinutos { get; private set; }

    public string Atividade { get; private set; }

    public string? Local { get; private set; }

    public string? Responsavel { get; private set; }

    public string? ResponsavelChave { get; private set; }

    public Guid? FornecedorCasamentoId { get; private set; }

    public string? Instrucoes { get; private set; }

    public string? NotasInternas { get; private set; }

    public StatusItemCronograma Status { get; private set; }

    public DateTimeOffset? ConcluidoEm { get; private set; }

    public Guid? CriadoPorUsuarioId { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public Guid? OrigemModeloItemId { get; private set; }

    public int? MinutosRelativosCerimonia { get; private set; }

    public bool AncoradoEmModelo => MinutosRelativosCerimonia is not null;

    public int MinutoInicial => ((int)Dia * MinutosPorDia) + (Inicio.Hour * 60) + Inicio.Minute;

    public int MinutoFinal => MinutoInicial + (DuracaoMinutos ?? 0);

    public TimeOnly? Termino => DuracaoMinutos is { } duracao ? Inicio.AddMinutes(duracao) : null;

    public bool TerminaEmOutroDia => DuracaoMinutos is { } duracao && (Inicio.Hour * 60) + Inicio.Minute + duracao >= MinutosPorDia;

    public static ItemCronograma Criar(
        Guid casamentoId,
        DadosItemCronograma dados,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora)
    {
        if (casamentoId == Guid.Empty)
        {
            throw new ArgumentException("O casamento do item é obrigatório.", nameof(casamentoId));
        }

        var item = new ItemCronograma
        {
            Id = Guid.NewGuid(),
            CasamentoId = casamentoId,
            Status = StatusItemCronograma.Previsto,
            CriadoPorUsuarioId = criadoPorUsuarioId,
            CriadoEm = agora,
        };

        item.Aplicar(dados, agora);
        return item;
    }

    public static ItemCronograma CriarDeModelo(
        Guid casamentoId,
        DadosItemCronograma dados,
        Guid origemModeloItemId,
        TimeOnly horarioCerimonia,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora)
    {
        if (origemModeloItemId == Guid.Empty)
        {
            throw new ArgumentException("A origem do item é obrigatória.", nameof(origemModeloItemId));
        }

        var item = Criar(casamentoId, dados, criadoPorUsuarioId, agora);
        item.OrigemModeloItemId = origemModeloItemId;
        item.MinutosRelativosCerimonia = item.MinutoInicial - MinutoDoDia(horarioCerimonia);
        return item;
    }

    public static int MinutoDoDia(TimeOnly horario)
    {
        return (horario.Hour * 60) + horario.Minute;
    }

    public static int PosicaoRelativaACerimonia(TimeOnly horarioCerimonia, int minutosDesdeCerimonia)
    {
        return Math.Clamp(MinutoDoDia(horarioCerimonia) + minutosDesdeCerimonia, PosicaoMinima, PosicaoMaxima);
    }

    public static bool ForaDaJanela(TimeOnly horarioCerimonia, int minutosDesdeCerimonia)
    {
        var posicao = MinutoDoDia(horarioCerimonia) + minutosDesdeCerimonia;
        return posicao is < PosicaoMinima or > PosicaoMaxima;
    }

    public void Atualizar(DadosItemCronograma dados, DateTimeOffset agora)
    {
        Aplicar(dados, agora);
    }

    public void Atualizar(DadosItemCronograma dados, TimeOnly? horarioCerimonia, DateTimeOffset agora)
    {
        var posicaoAnterior = MinutoInicial;
        Aplicar(dados, agora);

        if (posicaoAnterior != MinutoInicial && horarioCerimonia is { } cerimonia)
        {
            Reancorar(cerimonia);
        }
    }

    public int? PosicaoEsperada(TimeOnly? horarioCerimonia)
    {
        return MinutosRelativosCerimonia is { } ancora && horarioCerimonia is { } cerimonia
            ? PosicaoRelativaACerimonia(cerimonia, ancora)
            : null;
    }

    public bool HorarioDesatualizado(TimeOnly? horarioCerimonia)
    {
        return Status == StatusItemCronograma.Previsto
            && PosicaoEsperada(horarioCerimonia) is { } esperada
            && esperada != MinutoInicial;
    }

    public bool RecalcularPelaCerimonia(TimeOnly horarioCerimonia, DateTimeOffset agora)
    {
        if (!HorarioDesatualizado(horarioCerimonia))
        {
            return false;
        }

        var (dia, inicio) = DePosicao(PosicaoEsperada(horarioCerimonia)!.Value);
        Dia = dia;
        Inicio = inicio;
        AtualizadoEm = agora;
        return true;
    }

    public void Reancorar(TimeOnly horarioCerimonia)
    {
        if (MinutosRelativosCerimonia is null)
        {
            return;
        }

        MinutosRelativosCerimonia = MinutoInicial - MinutoDoDia(horarioCerimonia);
    }

    public ItemCronograma CopiarPara(
        Guid casamentoDestinoId,
        int deslocamentoMinutos,
        string? local,
        Guid? fornecedorCasamentoId,
        Guid? criadoPorUsuarioId,
        DateTimeOffset agora)
    {
        var (dia, inicio) = DePosicao(Math.Clamp(MinutoInicial + deslocamentoMinutos, PosicaoMinima, PosicaoMaxima));

        var copia = Criar(
            casamentoDestinoId,
            new DadosItemCronograma(dia, inicio, DuracaoMinutos, Atividade, local, Responsavel, fornecedorCasamentoId, Instrucoes, null),
            criadoPorUsuarioId,
            agora);
        copia.OrigemModeloItemId = OrigemModeloItemId;
        copia.MinutosRelativosCerimonia = MinutosRelativosCerimonia;
        return copia;
    }

    public DateOnly CalcularData(DateOnly dataCasamento)
    {
        return dataCasamento.AddDays((int)Dia);
    }

    public int? MinutosDesdeCerimonia(TimeOnly? horarioCerimonia)
    {
        return horarioCerimonia is { } cerimonia ? MinutoInicial - MinutoDoDia(cerimonia) : null;
    }

    public void MarcarConcluido(DateTimeOffset agora)
    {
        if (Status == StatusItemCronograma.Concluido)
        {
            return;
        }

        Status = StatusItemCronograma.Concluido;
        ConcluidoEm = agora;
        AtualizadoEm = agora;
    }

    public void Reabrir(DateTimeOffset agora)
    {
        if (Status == StatusItemCronograma.Previsto)
        {
            return;
        }

        Status = StatusItemCronograma.Previsto;
        ConcluidoEm = null;
        AtualizadoEm = agora;
    }

    public static (DiaCronograma Dia, TimeOnly Inicio) DePosicao(int minutoAbsoluto)
    {
        if (minutoAbsoluto is < PosicaoMinima or > PosicaoMaxima)
        {
            throw new ArgumentOutOfRangeException(nameof(minutoAbsoluto));
        }

        var dia = DiaDaPosicao(minutoAbsoluto);
        var minutosNoDia = minutoAbsoluto - ((int)dia * MinutosPorDia);
        return (dia, new TimeOnly(minutosNoDia / 60, minutosNoDia % 60));
    }

    private static DiaCronograma DiaDaPosicao(int minutoAbsoluto)
    {
        return minutoAbsoluto switch
        {
            < 0 => DiaCronograma.Vespera,
            < MinutosPorDia => DiaCronograma.DiaDoCasamento,
            _ => DiaCronograma.DiaSeguinte,
        };
    }

    private void Aplicar(DadosItemCronograma dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        if (!Enum.IsDefined(dados.Dia))
        {
            throw new RegraNegocioException(MensagensCronograma.DiaInvalido, CampoDia);
        }

        var atividade = NormalizadorTexto.Normalizar(dados.Atividade)
            ?? throw new RegraNegocioException(MensagensCronograma.AtividadeObrigatoria, CampoAtividade);

        if (atividade.Length is < TamanhoMinimoAtividade or > TamanhoMaximoAtividade)
        {
            throw new RegraNegocioException(MensagensCronograma.TamanhoAtividade, CampoAtividade);
        }

        if (dados.DuracaoMinutos is < DuracaoMinima or > DuracaoMaxima)
        {
            throw new RegraNegocioException(MensagensCronograma.DuracaoInvalida, CampoDuracao);
        }

        if (dados.FornecedorCasamentoId == Guid.Empty)
        {
            throw new RegraNegocioException(MensagensCronograma.FornecedorInvalido, CampoFornecedor);
        }

        var local = NormalizarOpcional(dados.Local, TamanhoMaximoLocal, MensagensCronograma.TamanhoLocal, CampoLocal);
        var responsavel = NormalizarOpcional(
            dados.Responsavel,
            TamanhoMaximoResponsavel,
            MensagensCronograma.TamanhoResponsavel,
            CampoResponsavel);
        var instrucoes = TextoLongo(dados.Instrucoes, CampoInstrucoes);
        var notas = TextoLongo(dados.NotasInternas, CampoNotasInternas);

        Dia = dados.Dia;
        Inicio = new TimeOnly(dados.Inicio.Hour, dados.Inicio.Minute);
        DuracaoMinutos = dados.DuracaoMinutos;
        Atividade = atividade;
        Local = local;
        Responsavel = responsavel;
        ResponsavelChave = NormalizadorTexto.ChaveComparacao(responsavel);
        FornecedorCasamentoId = dados.FornecedorCasamentoId;
        Instrucoes = instrucoes;
        NotasInternas = notas;
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

    private static string? TextoLongo(string? valor, string campo)
    {
        var texto = string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

        if (texto is { Length: > TamanhoMaximoTexto })
        {
            throw new RegraNegocioException(MensagensCronograma.TamanhoTexto, campo);
        }

        return texto;
    }
}
