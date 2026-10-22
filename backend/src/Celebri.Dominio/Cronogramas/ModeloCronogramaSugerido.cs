using Celebri.Dominio.Fornecedores;

namespace Celebri.Dominio.Cronogramas;

public static class ModeloCronogramaSugerido
{
    public const string Nome = "Roteiro clássico";
    public const string Descricao = "Do ensaio na véspera à desmontagem, com cerimônia à tarde e festa à noite. Edite à vontade.";

    public static readonly IReadOnlyList<DadosItemModeloCronograma> Itens =
    [
        Item(-1260, 60, "Ensaio da cerimônia", ReferenciaLocalCronograma.Cerimonia, "Assessoria", CategoriaFornecedor.CerimonialApoio, "Passar a ordem de entrada com padrinhos, pais e daminhas."),
        Item(-360, 240, "Making of da noiva", null, "Equipe de beleza", CategoriaFornecedor.Beleza, "Cabelo e maquiagem da noiva, da mãe e das madrinhas."),
        Item(-300, 240, "Chegada da decoração e montagem", ReferenciaLocalCronograma.Recepcao, "Decoração", CategoriaFornecedor.Decoracao, null),
        Item(-240, 180, "Fotos do making of", null, "Fotografia", CategoriaFornecedor.Fotografia, "Detalhes, vestido, alianças e preparação da noiva."),
        Item(-180, 120, "Making of do noivo", null, "Filmagem", CategoriaFornecedor.Filmagem, null),
        Item(-150, 150, "Chegada do buffet e montagem da cozinha", ReferenciaLocalCronograma.Recepcao, "Buffet", CategoriaFornecedor.Buffet, null),
        Item(-150, 90, "Chegada da banda e passagem de som", ReferenciaLocalCronograma.Recepcao, "Banda/DJ", CategoriaFornecedor.Musica, null),
        Item(-60, 30, "Passagem de som dos músicos da cerimônia", ReferenciaLocalCronograma.Cerimonia, "Banda/DJ", CategoriaFornecedor.Musica, null),
        Item(-30, 30, "Recepção dos convidados na cerimônia", ReferenciaLocalCronograma.Cerimonia, "Assessoria", CategoriaFornecedor.CerimonialApoio, "Entregar lembrancinhas e orientar os lugares reservados."),
        Item(0, 60, "Cerimônia", ReferenciaLocalCronograma.Cerimonia, "Celebrante", null, "Entrada dos padrinhos, pais, noivo e noiva conforme o roteiro."),
        Item(60, 30, "Cumprimentos aos noivos", ReferenciaLocalCronograma.Cerimonia, "Assessoria", null, null),
        Item(90, 30, "Fotos com família e padrinhos", ReferenciaLocalCronograma.Cerimonia, "Fotografia", CategoriaFornecedor.Fotografia, "Lista de grupos combinada com o casal."),
        Item(90, 90, "Coquetel de boas-vindas", ReferenciaLocalCronograma.Recepcao, "Buffet", CategoriaFornecedor.Buffet, null),
        Item(180, 15, "Entrada dos noivos no salão", ReferenciaLocalCronograma.Recepcao, "Banda/DJ", CategoriaFornecedor.Musica, null),
        Item(195, 10, "Primeira dança", ReferenciaLocalCronograma.Recepcao, "Assessoria", null, null),
        Item(210, 90, "Jantar", ReferenciaLocalCronograma.Recepcao, "Buffet", CategoriaFornecedor.Buffet, null),
        Item(300, 20, "Brinde e corte do bolo", ReferenciaLocalCronograma.Recepcao, "Confeitaria", CategoriaFornecedor.BoloDoces, null),
        Item(330, 210, "Festa e abertura da pista", ReferenciaLocalCronograma.Recepcao, "Banda/DJ", CategoriaFornecedor.Musica, null),
        Item(540, 30, "Encerramento e saída dos noivos", ReferenciaLocalCronograma.Recepcao, "Assessoria", null, null),
        Item(570, 120, "Desmontagem e retirada dos fornecedores", ReferenciaLocalCronograma.Recepcao, "Assessoria", null, "Conferir itens alugados e objetos esquecidos."),
    ];

    public static ModeloCronograma Criar(DateTimeOffset agora)
    {
        var modelo = ModeloCronograma.Criar(Nome, Descricao, ModeloCronograma.HorarioReferenciaPadrao, agora, sugerido: true);

        foreach (var item in Itens)
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
