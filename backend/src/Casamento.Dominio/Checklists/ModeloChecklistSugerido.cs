using Casamento.Dominio.Tarefas;

namespace Casamento.Dominio.Checklists;

public static class ModeloChecklistSugerido
{
    public const string Nome = "Checklist essencial";
    public const string Descricao = "Marcos de 12, 6 e 3 meses e 30 dias antes do casamento. Edite à vontade.";

    public const int DozeMeses = 365;
    public const int SeisMeses = 180;
    public const int TresMeses = 90;
    public const int TrintaDias = 30;

    public static readonly IReadOnlyList<DadosItemModeloChecklist> Itens =
    [
        Item("Definir orçamento e número estimado de convidados", "Combinar com o casal o teto de gastos e a faixa de convidados que orienta todas as contratações.", ResponsavelTarefa.Casal, CategoriaTarefa.Financeiro, DozeMeses),
        Item("Reservar local da cerimônia e da recepção", "Visitar opções, conferir capacidade, estacionamento e plano para chuva antes de assinar.", ResponsavelTarefa.Assessoria, CategoriaTarefa.Cerimonia, DozeMeses),
        Item("Contratar buffet", "Pedir três orçamentos com cardápio, serviço de bebidas e número de garçons.", ResponsavelTarefa.Assessoria, CategoriaTarefa.Fornecedores, DozeMeses),
        Item("Contratar fotografia e filmagem", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Fornecedores, DozeMeses),
        Item("Montar a lista preliminar de convidados", "Separar por família e amigos; serve de base para o orçamento e para o local.", ResponsavelTarefa.Casal, CategoriaTarefa.Convidados, DozeMeses),
        Item("Enviar o save the date", null, ResponsavelTarefa.Casal, CategoriaTarefa.Convidados, DozeMeses),
        Item("Contratar decoração e flores", "Alinhar paleta, estilo e itens alugados com o espaço contratado.", ResponsavelTarefa.Assessoria, CategoriaTarefa.Fornecedores, SeisMeses),
        Item("Contratar banda ou DJ", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Fornecedores, SeisMeses),
        Item("Contratar celebrante", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Cerimonia, SeisMeses),
        Item("Escolher os trajes do casal", "Agendar ateliês ou lojas e definir datas das provas.", ResponsavelTarefa.Casal, CategoriaTarefa.TrajesBeleza, SeisMeses),
        Item("Definir padrinhos e madrinhas", null, ResponsavelTarefa.Casal, CategoriaTarefa.Cerimonia, SeisMeses),
        Item("Encomendar convites e papelaria", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Convidados, SeisMeses),
        Item("Reservar hospedagem para convidados de fora", "Negociar bloqueio de quartos com tarifa especial perto do local.", ResponsavelTarefa.Assessoria, CategoriaTarefa.Convidados, SeisMeses),
        Item("Dar entrada na habilitação do casamento civil", "No cartório de registro civil; a habilitação vale 90 dias.", ResponsavelTarefa.Casal, CategoriaTarefa.Documentos, TresMeses),
        Item("Enviar os convites", null, ResponsavelTarefa.Casal, CategoriaTarefa.Convidados, TresMeses),
        Item("Fazer a degustação e fechar o cardápio", null, ResponsavelTarefa.Casal, CategoriaTarefa.Recepcao, TresMeses),
        Item("Contratar cabelo e maquiagem com teste", null, ResponsavelTarefa.Casal, CategoriaTarefa.TrajesBeleza, TresMeses),
        Item("Fazer a primeira prova dos trajes", null, ResponsavelTarefa.Casal, CategoriaTarefa.TrajesBeleza, TresMeses),
        Item("Definir o roteiro da cerimônia com o celebrante", "Entrada, leituras, votos, músicas e ordem dos padrinhos.", ResponsavelTarefa.Assessoria, CategoriaTarefa.Cerimonia, TresMeses),
        Item("Fechar a lista de confirmações de presença", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Convidados, TrintaDias),
        Item("Enviar o número final de convidados ao buffet", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Recepcao, TrintaDias),
        Item("Montar o mapa de mesas", null, ResponsavelTarefa.Casal, CategoriaTarefa.Recepcao, TrintaDias),
        Item("Montar o cronograma do dia com os fornecedores", "Horários de chegada, montagem, cerimônia, jantar e desmontagem.", ResponsavelTarefa.Assessoria, CategoriaTarefa.Cerimonia, TrintaDias),
        Item("Confirmar horários e logística com todos os fornecedores", null, ResponsavelTarefa.Assessoria, CategoriaTarefa.Fornecedores, TrintaDias),
        Item("Quitar os pagamentos pendentes dos fornecedores", null, ResponsavelTarefa.Casal, CategoriaTarefa.Financeiro, TrintaDias),
        Item("Fazer a prova final dos trajes", null, ResponsavelTarefa.Casal, CategoriaTarefa.TrajesBeleza, TrintaDias),
    ];

    public static ModeloChecklist Criar(DateTimeOffset agora)
    {
        var modelo = ModeloChecklist.Criar(Nome, Descricao, agora, sugerido: true);

        foreach (var item in Itens)
        {
            modelo.AdicionarItem(item, agora);
        }

        return modelo;
    }

    private static DadosItemModeloChecklist Item(
        string titulo,
        string? descricao,
        ResponsavelTarefa responsavel,
        CategoriaTarefa categoria,
        int dias)
    {
        return new DadosItemModeloChecklist(titulo, descricao, responsavel, categoria, dias);
    }
}
