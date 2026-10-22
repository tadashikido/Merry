namespace Celebri.Aplicacao.Convidados.Importacao;

public static class MensagensImportacaoConvidados
{
    public const string ArquivoVazio = "O arquivo está vazio.";
    public const string ArquivoNaoTexto = "Não conseguimos ler este arquivo. Envie uma planilha salva como CSV.";
    public const string ArquivoGrandeDemais = "O arquivo passa de 2 MB. Divida a lista em mais de uma planilha.";
    public const string ColunaNomeAusente = "Não encontramos a coluna Nome na primeira linha. Use o modelo para conferir as colunas.";
    public const string LinhasDemais = "A planilha tem mais de 5.000 linhas. Divida em arquivos menores.";
    public const string ColunasDemais = "A planilha tem mais de 50 colunas. Use o modelo para conferir as colunas.";
    public const string ImportacaoComProblemas = "Há linhas com problema. Corrija a planilha ou confirme a importação só dos convites válidos.";
    public const string NenhumConviteValido = "Nenhum convite válido para importar.";
    public const string PlanilhaAlterada = "A planilha mudou desde a pré-visualização. Confira de novo antes de importar.";
    public const string JaCadastrada = "Esta pessoa já está na lista deste casamento.";
    public const string PossivelDuplicado = "Possível duplicado: há outra pessoa com este nome sem telefone para comparar.";
    public const string LinhaExemplo = "Linha de exemplo do modelo. Apague antes de importar.";

    public static string CampoLongoDemais(int linha)
    {
        return $"A linha {linha} tem um campo com mais de 1.000 caracteres.";
    }

    public static string DuplicadaNaPlanilha(int linha)
    {
        return $"Pessoa repetida: igual à linha {linha}.";
    }

    public static string ValorDivergenteConvite(string coluna)
    {
        return $"O convite já tem outro valor em {coluna}; vale o da primeira linha.";
    }
}
