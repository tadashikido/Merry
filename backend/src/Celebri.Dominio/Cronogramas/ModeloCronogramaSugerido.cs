using Celebri.Dominio.Eventos;
using Celebri.Dominio.Fornecedores;

namespace Celebri.Dominio.Cronogramas;

public sealed record ConteudoModeloCronogramaSugerido(
    TipoEvento Tipo,
    string Nome,
    string Descricao,
    TimeOnly HorarioReferencia,
    IReadOnlyList<DadosItemModeloCronograma> Itens);

public static class ModeloCronogramaSugerido
{
    private const ReferenciaLocalCronograma Principal = ReferenciaLocalCronograma.Cerimonia;
    private const ReferenciaLocalCronograma Secundario = ReferenciaLocalCronograma.Recepcao;

    public static readonly ConteudoModeloCronogramaSugerido Casamento = new(
        TipoEvento.Casamento,
        "Roteiro clássico",
        "Do ensaio na véspera à desmontagem, com cerimônia à tarde e festa à noite. Edite à vontade.",
        ModeloCronograma.HorarioReferenciaPadrao,
        [
            Item(-1260, 60, "Ensaio da cerimônia", Principal, "Assessoria", CategoriaFornecedor.CerimonialApoio, "Passar a ordem de entrada com padrinhos, pais e daminhas."),
            Item(-360, 240, "Making of da noiva", null, "Equipe de beleza", CategoriaFornecedor.Beleza, "Cabelo e maquiagem da noiva, da mãe e das madrinhas."),
            Item(-300, 240, "Chegada da decoração e montagem", Secundario, "Decoração", CategoriaFornecedor.Decoracao, null),
            Item(-240, 180, "Fotos do making of", null, "Fotografia", CategoriaFornecedor.Fotografia, "Detalhes, vestido, alianças e preparação da noiva."),
            Item(-180, 120, "Making of do noivo", null, "Filmagem", CategoriaFornecedor.Filmagem, null),
            Item(-150, 150, "Chegada do buffet e montagem da cozinha", Secundario, "Buffet", CategoriaFornecedor.Buffet, null),
            Item(-150, 90, "Chegada da banda e passagem de som", Secundario, "Banda/DJ", CategoriaFornecedor.Musica, null),
            Item(-60, 30, "Passagem de som dos músicos da cerimônia", Principal, "Banda/DJ", CategoriaFornecedor.Musica, null),
            Item(-30, 30, "Recepção dos convidados na cerimônia", Principal, "Assessoria", CategoriaFornecedor.CerimonialApoio, "Entregar lembrancinhas e orientar os lugares reservados."),
            Item(0, 60, "Cerimônia", Principal, "Celebrante", null, "Entrada dos padrinhos, pais, noivo e noiva conforme o roteiro."),
            Item(60, 30, "Cumprimentos aos noivos", Principal, "Assessoria", null, null),
            Item(90, 30, "Fotos com família e padrinhos", Principal, "Fotografia", CategoriaFornecedor.Fotografia, "Lista de grupos combinada com o casal."),
            Item(90, 90, "Coquetel de boas-vindas", Secundario, "Buffet", CategoriaFornecedor.Buffet, null),
            Item(180, 15, "Entrada dos noivos no salão", Secundario, "Banda/DJ", CategoriaFornecedor.Musica, null),
            Item(195, 10, "Primeira dança", Secundario, "Assessoria", null, null),
            Item(210, 90, "Jantar", Secundario, "Buffet", CategoriaFornecedor.Buffet, null),
            Item(300, 20, "Brinde e corte do bolo", Secundario, "Confeitaria", CategoriaFornecedor.BoloDoces, null),
            Item(330, 210, "Festa e abertura da pista", Secundario, "Banda/DJ", CategoriaFornecedor.Musica, null),
            Item(540, 30, "Encerramento e saída dos noivos", Secundario, "Assessoria", null, null),
            Item(570, 120, "Desmontagem e retirada dos fornecedores", Secundario, "Assessoria", null, "Conferir itens alugados e objetos esquecidos."),
        ]);

    public static readonly ConteudoModeloCronogramaSugerido QuinzeAnos = new(
        TipoEvento.QuinzeAnos,
        "Roteiro de 15 anos",
        "Da montagem à desmontagem, com entrada da debutante, valsa e festa. Edite à vontade.",
        new TimeOnly(20, 0),
        [
            Item(-480, 240, "Chegada da decoração e montagem", Principal, "Decoração", CategoriaFornecedor.Decoracao, null),
            Item(-360, 180, "Cabelo e maquiagem da debutante", null, "Equipe de beleza", CategoriaFornecedor.Beleza, null),
            Item(-240, 120, "Fotos da preparação", null, "Fotografia", CategoriaFornecedor.Fotografia, "Detalhes, vestido e família antes da festa."),
            Item(-180, 150, "Chegada do buffet e montagem da cozinha", Principal, "Buffet", CategoriaFornecedor.Buffet, null),
            Item(-120, 90, "Chegada da banda ou DJ e passagem de som", Principal, "Banda/DJ", CategoriaFornecedor.Musica, null),
            Item(-30, 30, "Ensaio rápido da entrada e da valsa", Principal, "Assessoria", CategoriaFornecedor.CerimonialApoio, null),
            Item(0, 60, "Recepção dos convidados", Principal, "Assessoria", CategoriaFornecedor.CerimonialApoio, null),
            Item(60, 15, "Entrada da debutante", Principal, "Assessoria", null, null),
            Item(75, 20, "Valsa", Principal, "Banda/DJ", CategoriaFornecedor.Musica, "Valsa com o pai e com os pares combinados."),
            Item(95, 20, "Homenagens e discursos", Principal, "Assessoria", null, null),
            Item(120, 90, "Jantar", Principal, "Buffet", CategoriaFornecedor.Buffet, null),
            Item(210, 15, "Parabéns e bolo", Principal, "Confeitaria", CategoriaFornecedor.BoloDoces, null),
            Item(225, 165, "Festa e abertura da pista", Principal, "Banda/DJ", CategoriaFornecedor.Musica, null),
            Item(390, 30, "Encerramento", Principal, "Assessoria", null, null),
            Item(420, 120, "Desmontagem e retirada dos fornecedores", Principal, "Assessoria", null, "Conferir itens alugados e objetos esquecidos."),
        ]);

    public static readonly ConteudoModeloCronogramaSugerido Aniversario = new(
        TipoEvento.Aniversario,
        "Roteiro de aniversário",
        "Da montagem à desmontagem, com jantar, parabéns e festa. Edite à vontade.",
        new TimeOnly(19, 0),
        [
            Item(-240, 180, "Chegada da decoração e montagem", Principal, "Decoração", CategoriaFornecedor.Decoracao, null),
            Item(-120, 120, "Chegada do buffet e montagem da cozinha", Principal, "Buffet", CategoriaFornecedor.Buffet, null),
            Item(-90, 60, "Chegada da música e passagem de som", Principal, "Banda/DJ", CategoriaFornecedor.Musica, null),
            Item(0, 60, "Recepção dos convidados", Principal, "Assessoria", CategoriaFornecedor.CerimonialApoio, null),
            Item(60, 90, "Jantar", Principal, "Buffet", CategoriaFornecedor.Buffet, null),
            Item(150, 20, "Parabéns e bolo", Principal, "Confeitaria", CategoriaFornecedor.BoloDoces, "Combinar quem chama os convidados e acende as velas."),
            Item(170, 130, "Festa", Principal, "Banda/DJ", CategoriaFornecedor.Musica, null),
            Item(300, 30, "Encerramento", Principal, "Assessoria", null, null),
            Item(330, 90, "Desmontagem e retirada dos fornecedores", Principal, "Assessoria", null, "Conferir itens alugados e objetos esquecidos."),
        ]);

    public static readonly ConteudoModeloCronogramaSugerido Comemoracao = new(
        TipoEvento.Comemoracao,
        "Roteiro de comemoração",
        "Da montagem à desmontagem, com homenagens, jantar e brinde. Edite à vontade.",
        new TimeOnly(19, 0),
        [
            Item(-240, 180, "Chegada da decoração e montagem", Principal, "Decoração", CategoriaFornecedor.Decoracao, null),
            Item(-120, 120, "Chegada do buffet e montagem da cozinha", Principal, "Buffet", CategoriaFornecedor.Buffet, null),
            Item(-60, 60, "Passagem de som", Principal, "Banda/DJ", CategoriaFornecedor.Musica, null),
            Item(0, 45, "Recepção dos convidados", Principal, "Assessoria", CategoriaFornecedor.CerimonialApoio, null),
            Item(45, 30, "Homenagens e discursos", Principal, "Assessoria", null, null),
            Item(75, 90, "Jantar", Principal, "Buffet", CategoriaFornecedor.Buffet, null),
            Item(165, 15, "Brinde e bolo", Principal, "Confeitaria", CategoriaFornecedor.BoloDoces, null),
            Item(180, 120, "Festa", Principal, "Banda/DJ", CategoriaFornecedor.Musica, null),
            Item(300, 30, "Encerramento", Principal, "Assessoria", null, null),
            Item(330, 90, "Desmontagem e retirada dos fornecedores", Principal, "Assessoria", null, "Conferir itens alugados e objetos esquecidos."),
        ]);

    public static readonly IReadOnlyList<ConteudoModeloCronogramaSugerido> Conteudos = [Casamento, QuinzeAnos, Aniversario, Comemoracao];

    public static ConteudoModeloCronogramaSugerido Para(TipoEvento tipo)
    {
        return Conteudos.FirstOrDefault(conteudo => conteudo.Tipo == tipo)
            ?? throw new ArgumentOutOfRangeException(nameof(tipo), tipo, null);
    }

    public static ModeloCronograma Criar(TipoEvento tipo, DateTimeOffset agora)
    {
        var conteudo = Para(tipo);
        var modelo = ModeloCronograma.Criar(
            conteudo.Nome,
            conteudo.Descricao,
            conteudo.HorarioReferencia,
            agora,
            sugerido: true,
            tipoEvento: conteudo.Tipo);

        foreach (var item in conteudo.Itens)
        {
            modelo.AdicionarItem(item, agora);
        }

        return modelo;
    }

    private static DadosItemModeloCronograma Item(
        int minutosDesdeCerimonia,
        int? duracaoMinutos,
        string atividade,
        ReferenciaLocalCronograma? referenciaLocal,
        string? responsavel,
        CategoriaFornecedor? categoria,
        string? instrucoes)
    {
        return new DadosItemModeloCronograma(
            minutosDesdeCerimonia,
            duracaoMinutos,
            atividade,
            referenciaLocal,
            null,
            responsavel,
            categoria,
            instrucoes);
    }
}
