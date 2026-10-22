using Celebri.Dominio.Eventos;
using Celebri.Dominio.Tarefas;

namespace Celebri.Dominio.Checklists;

public sealed record ConteudoModeloChecklistSugerido(
    TipoEvento Tipo,
    string Nome,
    string Descricao,
    IReadOnlyList<DadosItemModeloChecklist> Itens);

public static class ModeloChecklistSugerido
{
    public const int DozeMeses = 365;
    public const int SeisMeses = 180;
    public const int TresMeses = 90;
    public const int TrintaDias = 30;

    private const ResponsavelTarefa Anfitriao = ResponsavelTarefa.Anfitriao;
    private const ResponsavelTarefa Assessoria = ResponsavelTarefa.Assessoria;

    public static readonly ConteudoModeloChecklistSugerido Casamento = new(
        TipoEvento.Casamento,
        "Checklist essencial",
        "Marcos de 12, 6 e 3 meses e 30 dias antes do casamento. Edite à vontade.",
        [
            Item("Definir orçamento e número estimado de convidados", "Combinar com o casal o teto de gastos e a faixa de convidados que orienta todas as contratações.", Anfitriao, CategoriaTarefa.Financeiro, DozeMeses),
            Item("Reservar local da cerimônia e da recepção", "Visitar opções, conferir capacidade, estacionamento e plano para chuva antes de assinar.", Assessoria, CategoriaTarefa.Cerimonia, DozeMeses),
            Item("Contratar buffet", "Pedir três orçamentos com cardápio, serviço de bebidas e número de garçons.", Assessoria, CategoriaTarefa.Fornecedores, DozeMeses),
            Item("Contratar fotografia e filmagem", null, Assessoria, CategoriaTarefa.Fornecedores, DozeMeses),
            Item("Montar a lista preliminar de convidados", "Separar por família e amigos; serve de base para o orçamento e para o local.", Anfitriao, CategoriaTarefa.Convidados, DozeMeses),
            Item("Enviar o save the date", null, Anfitriao, CategoriaTarefa.Convidados, DozeMeses),
            Item("Contratar decoração e flores", "Alinhar paleta, estilo e itens alugados com o espaço contratado.", Assessoria, CategoriaTarefa.Fornecedores, SeisMeses),
            Item("Contratar banda ou DJ", null, Assessoria, CategoriaTarefa.Fornecedores, SeisMeses),
            Item("Contratar celebrante", null, Assessoria, CategoriaTarefa.Cerimonia, SeisMeses),
            Item("Escolher os trajes do casal", "Agendar ateliês ou lojas e definir datas das provas.", Anfitriao, CategoriaTarefa.TrajesBeleza, SeisMeses),
            Item("Definir padrinhos e madrinhas", null, Anfitriao, CategoriaTarefa.Cerimonia, SeisMeses),
            Item("Encomendar convites e papelaria", null, Assessoria, CategoriaTarefa.Convidados, SeisMeses),
            Item("Reservar hospedagem para convidados de fora", "Negociar bloqueio de quartos com tarifa especial perto do local.", Assessoria, CategoriaTarefa.Convidados, SeisMeses),
            Item("Dar entrada na habilitação do casamento civil", "No cartório de registro civil; a habilitação vale 90 dias.", Anfitriao, CategoriaTarefa.Documentos, TresMeses),
            Item("Enviar os convites", null, Anfitriao, CategoriaTarefa.Convidados, TresMeses),
            Item("Fazer a degustação e fechar o cardápio", null, Anfitriao, CategoriaTarefa.Recepcao, TresMeses),
            Item("Contratar cabelo e maquiagem com teste", null, Anfitriao, CategoriaTarefa.TrajesBeleza, TresMeses),
            Item("Fazer a primeira prova dos trajes", null, Anfitriao, CategoriaTarefa.TrajesBeleza, TresMeses),
            Item("Definir o roteiro da cerimônia com o celebrante", "Entrada, leituras, votos, músicas e ordem dos padrinhos.", Assessoria, CategoriaTarefa.Cerimonia, TresMeses),
            Item("Fechar a lista de confirmações de presença", null, Assessoria, CategoriaTarefa.Convidados, TrintaDias),
            Item("Enviar o número final de convidados ao buffet", null, Assessoria, CategoriaTarefa.Recepcao, TrintaDias),
            Item("Montar o mapa de mesas", null, Anfitriao, CategoriaTarefa.Recepcao, TrintaDias),
            Item("Montar o cronograma do dia com os fornecedores", "Horários de chegada, montagem, cerimônia, jantar e desmontagem.", Assessoria, CategoriaTarefa.Cerimonia, TrintaDias),
            Item("Confirmar horários e logística com todos os fornecedores", null, Assessoria, CategoriaTarefa.Fornecedores, TrintaDias),
            Item("Quitar os pagamentos pendentes dos fornecedores", null, Anfitriao, CategoriaTarefa.Financeiro, TrintaDias),
            Item("Fazer a prova final dos trajes", null, Anfitriao, CategoriaTarefa.TrajesBeleza, TrintaDias),
        ]);

    public static readonly ConteudoModeloChecklistSugerido QuinzeAnos = new(
        TipoEvento.QuinzeAnos,
        "Checklist essencial · 15 anos",
        "Marcos de 12, 6 e 3 meses e 30 dias antes da festa de 15 anos. Edite à vontade.",
        [
            Item("Definir orçamento e número estimado de convidados", "Combinar com a família o teto de gastos e a faixa de convidados que orienta todas as contratações.", Anfitriao, CategoriaTarefa.Financeiro, DozeMeses),
            Item("Reservar o local da festa", "Visitar opções, conferir capacidade, pista de dança e estacionamento antes de assinar.", Assessoria, CategoriaTarefa.Recepcao, DozeMeses),
            Item("Contratar buffet", "Pedir três orçamentos com cardápio, serviço de bebidas e número de garçons.", Assessoria, CategoriaTarefa.Fornecedores, DozeMeses),
            Item("Contratar fotografia e filmagem", null, Assessoria, CategoriaTarefa.Fornecedores, DozeMeses),
            Item("Montar a lista preliminar de convidados", "Separar família, amigos da escola e amigos da família.", Anfitriao, CategoriaTarefa.Convidados, DozeMeses),
            Item("Contratar decoração e flores", "Alinhar tema, paleta e itens alugados com o espaço contratado.", Assessoria, CategoriaTarefa.Fornecedores, SeisMeses),
            Item("Contratar banda ou DJ", null, Assessoria, CategoriaTarefa.Fornecedores, SeisMeses),
            Item("Escolher o vestido da debutante", "Vestido da entrada e, se houver, o da troca para a pista.", Anfitriao, CategoriaTarefa.TrajesBeleza, SeisMeses),
            Item("Definir os pares da valsa", null, Anfitriao, CategoriaTarefa.Geral, SeisMeses),
            Item("Encomendar convites e papelaria", null, Assessoria, CategoriaTarefa.Convidados, SeisMeses),
            Item("Enviar os convites", null, Anfitriao, CategoriaTarefa.Convidados, TresMeses),
            Item("Ensaiar a valsa com o coreógrafo", "Combinar datas de ensaio com a debutante e os pares.", Anfitriao, CategoriaTarefa.Geral, TresMeses),
            Item("Escolher as músicas da entrada, da valsa e das homenagens", null, Assessoria, CategoriaTarefa.Geral, TresMeses),
            Item("Fazer a degustação e fechar o cardápio", null, Anfitriao, CategoriaTarefa.Recepcao, TresMeses),
            Item("Contratar cabelo e maquiagem com teste", null, Anfitriao, CategoriaTarefa.TrajesBeleza, TresMeses),
            Item("Fechar a lista de confirmações de presença", null, Assessoria, CategoriaTarefa.Convidados, TrintaDias),
            Item("Enviar o número final de convidados ao buffet", null, Assessoria, CategoriaTarefa.Recepcao, TrintaDias),
            Item("Montar o mapa de mesas", null, Anfitriao, CategoriaTarefa.Recepcao, TrintaDias),
            Item("Montar o cronograma do dia com os fornecedores", "Horários de chegada, entrada da debutante, valsa, jantar, bolo e desmontagem.", Assessoria, CategoriaTarefa.Geral, TrintaDias),
            Item("Confirmar horários e logística com todos os fornecedores", null, Assessoria, CategoriaTarefa.Fornecedores, TrintaDias),
            Item("Quitar os pagamentos pendentes dos fornecedores", null, Anfitriao, CategoriaTarefa.Financeiro, TrintaDias),
            Item("Fazer a prova final do vestido", null, Anfitriao, CategoriaTarefa.TrajesBeleza, TrintaDias),
        ]);

    public static readonly ConteudoModeloChecklistSugerido Aniversario = new(
        TipoEvento.Aniversario,
        "Checklist essencial · Aniversário",
        "Marcos de 6 e 3 meses e 30 dias antes do aniversário. Edite à vontade.",
        [
            Item("Definir orçamento e número estimado de convidados", "Combinar o teto de gastos e a faixa de convidados que orienta as contratações.", Anfitriao, CategoriaTarefa.Financeiro, SeisMeses),
            Item("Reservar o local da festa", "Conferir capacidade, horário de uso e estacionamento antes de assinar.", Assessoria, CategoriaTarefa.Recepcao, SeisMeses),
            Item("Contratar buffet", "Pedir orçamentos com cardápio e serviço de bebidas.", Assessoria, CategoriaTarefa.Fornecedores, SeisMeses),
            Item("Montar a lista de convidados", null, Anfitriao, CategoriaTarefa.Convidados, SeisMeses),
            Item("Contratar decoração", "Alinhar tema e itens alugados com o espaço contratado.", Assessoria, CategoriaTarefa.Fornecedores, TresMeses),
            Item("Contratar fotografia", null, Assessoria, CategoriaTarefa.Fornecedores, TresMeses),
            Item("Contratar música ou DJ", null, Assessoria, CategoriaTarefa.Fornecedores, TresMeses),
            Item("Enviar os convites", null, Anfitriao, CategoriaTarefa.Convidados, TresMeses),
            Item("Encomendar bolo e doces", null, Anfitriao, CategoriaTarefa.Recepcao, TrintaDias),
            Item("Fechar a lista de confirmações de presença", null, Assessoria, CategoriaTarefa.Convidados, TrintaDias),
            Item("Enviar o número final de convidados ao buffet", null, Assessoria, CategoriaTarefa.Recepcao, TrintaDias),
            Item("Montar o cronograma do dia com os fornecedores", "Horários de chegada, montagem, parabéns e desmontagem.", Assessoria, CategoriaTarefa.Geral, TrintaDias),
            Item("Confirmar horários e logística com todos os fornecedores", null, Assessoria, CategoriaTarefa.Fornecedores, TrintaDias),
            Item("Quitar os pagamentos pendentes dos fornecedores", null, Anfitriao, CategoriaTarefa.Financeiro, TrintaDias),
        ]);

    public static readonly ConteudoModeloChecklistSugerido Comemoracao = new(
        TipoEvento.Comemoracao,
        "Checklist essencial · Comemoração",
        "Marcos de 6 e 3 meses e 30 dias antes da comemoração. Edite à vontade.",
        [
            Item("Definir orçamento e número estimado de convidados", "Combinar o teto de gastos e a faixa de convidados que orienta as contratações.", Anfitriao, CategoriaTarefa.Financeiro, SeisMeses),
            Item("Reservar o local", "Conferir capacidade, horário de uso e estacionamento antes de assinar.", Assessoria, CategoriaTarefa.Recepcao, SeisMeses),
            Item("Contratar buffet", "Pedir orçamentos com cardápio e serviço de bebidas.", Assessoria, CategoriaTarefa.Fornecedores, SeisMeses),
            Item("Montar a lista de convidados", null, Anfitriao, CategoriaTarefa.Convidados, SeisMeses),
            Item("Contratar decoração", null, Assessoria, CategoriaTarefa.Fornecedores, TresMeses),
            Item("Contratar fotografia", null, Assessoria, CategoriaTarefa.Fornecedores, TresMeses),
            Item("Enviar os convites", null, Anfitriao, CategoriaTarefa.Convidados, TresMeses),
            Item("Definir homenagens e discursos", "Quem fala, em que ordem e se haverá vídeo ou fotos projetadas.", Anfitriao, CategoriaTarefa.Geral, TresMeses),
            Item("Encomendar bolo e doces", null, Anfitriao, CategoriaTarefa.Recepcao, TrintaDias),
            Item("Fechar a lista de confirmações de presença", null, Assessoria, CategoriaTarefa.Convidados, TrintaDias),
            Item("Enviar o número final de convidados ao buffet", null, Assessoria, CategoriaTarefa.Recepcao, TrintaDias),
            Item("Montar o cronograma do dia com os fornecedores", "Horários de chegada, homenagens, jantar e desmontagem.", Assessoria, CategoriaTarefa.Geral, TrintaDias),
            Item("Confirmar horários e logística com todos os fornecedores", null, Assessoria, CategoriaTarefa.Fornecedores, TrintaDias),
            Item("Quitar os pagamentos pendentes dos fornecedores", null, Anfitriao, CategoriaTarefa.Financeiro, TrintaDias),
        ]);

    public static readonly IReadOnlyList<ConteudoModeloChecklistSugerido> Conteudos = [Casamento, QuinzeAnos, Aniversario, Comemoracao];

    public static ConteudoModeloChecklistSugerido Para(TipoEvento tipo)
    {
        return Conteudos.FirstOrDefault(conteudo => conteudo.Tipo == tipo)
            ?? throw new ArgumentOutOfRangeException(nameof(tipo), tipo, null);
    }

    public static ModeloChecklist Criar(TipoEvento tipo, DateTimeOffset agora)
    {
        var conteudo = Para(tipo);
        var modelo = ModeloChecklist.Criar(conteudo.Nome, conteudo.Descricao, agora, sugerido: true, tipoEvento: conteudo.Tipo);

        foreach (var item in conteudo.Itens)
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
