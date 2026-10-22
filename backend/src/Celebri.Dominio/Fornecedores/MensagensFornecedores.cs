namespace Casamento.Dominio.Fornecedores;

public static class MensagensFornecedores
{
    public const string CategoriaObrigatoria = "Escolha a categoria.";
    public const string CategoriaInvalida = "Escolha uma categoria da lista.";
    public const string NomeEmpresaObrigatorio = "Informe o nome da empresa.";
    public const string TamanhoNomeEmpresa = "Use de 2 a 120 caracteres.";
    public const string TamanhoResponsavel = "Use até 120 caracteres.";
    public const string TelefoneInvalido = "Informe um telefone com DDD, só com números, espaços, parênteses ou traço.";
    public const string EmailInvalido = "Informe um e-mail válido, como nome@empresa.com.br.";
    public const string SiteInvalido = "Informe um endereço de site válido, como buffetsaojoao.com.br.";
    public const string InstagramInvalido = "Use só letras, números, ponto e sublinhado (até 30).";
    public const string TamanhoObservacoes = "Use até 2.000 caracteres.";
    public const string NomeRepetido = "Já existe um fornecedor com esse nome nessa categoria.";
    public const string NomeRepetidoArquivado = "Já existe um fornecedor arquivado com esse nome nessa categoria. Restaure-o em Arquivados.";
    public const string LimiteFornecedores = "Sua base chegou a 1.000 fornecedores. Arquive ou exclua algum para cadastrar outro.";
    public const string ArquivadoSemEdicao = "Restaure o fornecedor para editar.";
    public const string FornecedorNaoEncontrado = "Fornecedor não encontrado.";
    public const string ParticipouDeCasamentos = "Este fornecedor já participou de casamentos. Arquive-o em vez de excluir.";
}
