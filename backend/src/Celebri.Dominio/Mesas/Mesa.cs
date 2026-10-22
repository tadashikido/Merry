using Celebri.Dominio.Convidados;
using Celebri.Dominio.Excecoes;
using Celebri.Dominio.Isolamento;

namespace Celebri.Dominio.Mesas;

public class Mesa : IPertenceCasamento
{
    public const int NumeroMinimo = 1;
    public const int NumeroMaximo = 999;
    public const int CapacidadeMinima = 1;
    public const int CapacidadeMaxima = 30;
    public const int TamanhoMaximoNome = 60;
    public const int MesasMaximoPorCasamento = 500;
    public const int PessoasMaximoPorOperacao = 200;
    public const string CampoNumero = "numero";
    public const string CampoCapacidade = "capacidade";
    public const string CampoEspecial = "especial";
    public const string CampoNome = "nome";

    private Mesa()
    {
    }

    public Guid Id { get; private set; }

    public Guid OrganizacaoId { get; private set; }

    public Guid CasamentoId { get; private set; }

    public int Numero { get; private set; }

    public string? Nome { get; private set; }

    public int Capacidade { get; private set; }

    public bool Especial { get; private set; }

    public DateTimeOffset CriadoEm { get; private set; }

    public DateTimeOffset AtualizadoEm { get; private set; }

    public string Rotulo => Rotular(Numero, Nome, Especial);

    public static string Rotular(int numero, string? nome, bool especial)
    {
        if (especial && nome is null)
        {
            return "Mesa dos noivos";
        }

        return nome is null ? $"Mesa {numero}" : $"Mesa {numero} · {nome}";
    }

    public static Mesa Criar(Guid casamentoId, DadosMesa dados, DateTimeOffset agora)
    {
        if (casamentoId == Guid.Empty)
        {
            throw new ArgumentException("O casamento da mesa é obrigatório.", nameof(casamentoId));
        }

        var mesa = new Mesa
        {
            Id = Guid.NewGuid(),
            CasamentoId = casamentoId,
            CriadoEm = agora,
        };

        mesa.Aplicar(dados, agora);
        return mesa;
    }

    public void Atualizar(DadosMesa dados, int ocupacaoAtual, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        if (dados.Capacidade >= CapacidadeMinima && dados.Capacidade < ocupacaoAtual)
        {
            throw new RegraNegocioException(MensagensMesas.CapacidadeAbaixoDaOcupacao(Rotulo, ocupacaoAtual), CampoCapacidade);
        }

        Aplicar(dados, agora);
    }

    public int Receber(IReadOnlyCollection<Convidado> pessoas, int ocupacaoAtual, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(pessoas);

        if (pessoas.Any(pessoa => pessoa.Resposta != RespostaRsvp.Confirmado))
        {
            throw new RegraNegocioException(MensagensMesas.SomenteConfirmados);
        }

        var chegando = pessoas.Count(pessoa => pessoa.MesaId != Id);
        var livres = Capacidade - ocupacaoAtual;

        if (chegando > livres)
        {
            throw new RegraNegocioException(MensagensMesas.CapacidadeExcedida(Rotulo, Capacidade, Math.Max(livres, 0)));
        }

        foreach (var pessoa in pessoas)
        {
            pessoa.Sentar(Id, agora);
        }

        AtualizadoEm = agora;
        return chegando;
    }

    public void RegistrarAlteracaoOcupacao(DateTimeOffset agora)
    {
        AtualizadoEm = agora;
    }

    private void Aplicar(DadosMesa dados, DateTimeOffset agora)
    {
        ArgumentNullException.ThrowIfNull(dados);

        if (dados.Numero is < NumeroMinimo or > NumeroMaximo)
        {
            throw new RegraNegocioException(MensagensMesas.NumeroForaDaFaixa, CampoNumero);
        }

        if (dados.Capacidade is < CapacidadeMinima or > CapacidadeMaxima)
        {
            throw new RegraNegocioException(MensagensMesas.CapacidadeForaDaFaixa, CampoCapacidade);
        }

        var nome = NormalizadorTexto.Normalizar(dados.Nome);

        if (nome is { Length: > TamanhoMaximoNome })
        {
            throw new RegraNegocioException(MensagensMesas.TamanhoNome, CampoNome);
        }

        Numero = dados.Numero;
        Nome = nome;
        Capacidade = dados.Capacidade;
        Especial = dados.Especial;
        AtualizadoEm = agora;
    }
}
