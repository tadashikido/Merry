using System.Text;
using Casamento.Dominio.Excecoes;

namespace Casamento.Aplicacao.Convidados.Importacao;

public static class LeitorCsv
{
    private const char Aspas = '"';
    private const char PontoEVirgula = ';';
    private const char Virgula = ',';
    private const int PaginaCodigoWindows1252 = 1252;

    private static readonly UTF8Encoding Utf8Estrito = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);
    private static readonly byte[] PreambuloUtf8 = [0xEF, 0xBB, 0xBF];

    public static PlanilhaLida Ler(byte[] conteudo)
    {
        ArgumentNullException.ThrowIfNull(conteudo);

        var texto = Decodificar(conteudo);
        var separador = DetectarSeparador(texto);
        var registros = Separar(texto, separador);

        if (registros.Count == 0)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.ArquivoVazio);
        }

        var cabecalho = registros[0].Celulas.Select(celula => celula.Trim()).ToList();
        var linhas = registros.Skip(1).ToList();

        if (linhas.Count == 0)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.ArquivoVazio);
        }

        return new PlanilhaLida(cabecalho, linhas);
    }

    public static string Decodificar(byte[] conteudo)
    {
        ArgumentNullException.ThrowIfNull(conteudo);

        if (conteudo.Length == 0)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.ArquivoVazio);
        }

        if (Array.IndexOf(conteudo, (byte)0) >= 0)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.ArquivoNaoTexto);
        }

        var texto = conteudo.AsSpan().StartsWith(PreambuloUtf8)
            ? DecodificarUtf8(conteudo.AsSpan(PreambuloUtf8.Length))
            : DecodificarUtf8OuWindows1252(conteudo);

        if (texto.Any(caractere => char.IsControl(caractere) && caractere is not ('\t' or '\r' or '\n') && caractere < '\u0080'))
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.ArquivoNaoTexto);
        }

        return texto;
    }

    public static char DetectarSeparador(string texto)
    {
        ArgumentNullException.ThrowIfNull(texto);

        var pontoEVirgula = 0;
        var virgula = 0;
        var entreAspas = false;

        foreach (var caractere in texto)
        {
            if (caractere == Aspas)
            {
                entreAspas = !entreAspas;
                continue;
            }

            if (entreAspas)
            {
                continue;
            }

            if (caractere is '\r' or '\n')
            {
                break;
            }

            if (caractere == PontoEVirgula)
            {
                pontoEVirgula++;
            }
            else if (caractere == Virgula)
            {
                virgula++;
            }
        }

        return virgula > pontoEVirgula ? Virgula : PontoEVirgula;
    }

    private static string DecodificarUtf8(ReadOnlySpan<byte> conteudo)
    {
        try
        {
            return Utf8Estrito.GetString(conteudo);
        }
        catch (DecoderFallbackException)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.ArquivoNaoTexto);
        }
    }

    private static string DecodificarUtf8OuWindows1252(byte[] conteudo)
    {
        try
        {
            return Utf8Estrito.GetString(conteudo);
        }
        catch (DecoderFallbackException)
        {
            var windows1252 = CodePagesEncodingProvider.Instance.GetEncoding(PaginaCodigoWindows1252)
                ?? throw new RegraNegocioException(MensagensImportacaoConvidados.ArquivoNaoTexto);
            return windows1252.GetString(conteudo);
        }
    }

    private static List<LinhaPlanilha> Separar(string texto, char separador)
    {
        var registros = new List<LinhaPlanilha>();
        var celulas = new List<string>();
        var campo = new StringBuilder();
        var entreAspas = false;
        var linhaAtual = 1;
        var linhaInicioRegistro = 1;
        var indice = 0;

        while (indice < texto.Length)
        {
            var caractere = texto[indice];

            if (entreAspas)
            {
                if (caractere == Aspas)
                {
                    if (indice + 1 < texto.Length && texto[indice + 1] == Aspas)
                    {
                        Acrescentar(campo, Aspas, linhaInicioRegistro);
                        indice += 2;
                        continue;
                    }

                    entreAspas = false;
                    indice++;
                    continue;
                }

                if (caractere == '\n' || (caractere == '\r' && (indice + 1 >= texto.Length || texto[indice + 1] != '\n')))
                {
                    linhaAtual++;
                }

                Acrescentar(campo, caractere, linhaInicioRegistro);
                indice++;
                continue;
            }

            if (caractere == Aspas && campo.Length == 0)
            {
                entreAspas = true;
                indice++;
                continue;
            }

            if (caractere == separador)
            {
                FecharCampo(celulas, campo);
                indice++;
                continue;
            }

            if (caractere is '\r' or '\n')
            {
                FecharCampo(celulas, campo);
                AdicionarRegistro(registros, celulas, linhaInicioRegistro);
                celulas = [];
                indice += caractere == '\r' && indice + 1 < texto.Length && texto[indice + 1] == '\n' ? 2 : 1;
                linhaAtual++;
                linhaInicioRegistro = linhaAtual;
                continue;
            }

            Acrescentar(campo, caractere, linhaInicioRegistro);
            indice++;
        }

        if (campo.Length > 0 || celulas.Count > 0)
        {
            FecharCampo(celulas, campo);
            AdicionarRegistro(registros, celulas, linhaInicioRegistro);
        }

        return registros;
    }

    private static void Acrescentar(StringBuilder campo, char caractere, int linha)
    {
        if (campo.Length >= LimitesImportacao.TamanhoMaximoCampo)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.CampoLongoDemais(linha));
        }

        campo.Append(caractere);
    }

    private static void FecharCampo(List<string> celulas, StringBuilder campo)
    {
        if (celulas.Count >= LimitesImportacao.ColunasMaximas)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.ColunasDemais);
        }

        celulas.Add(campo.ToString());
        campo.Clear();
    }

    private static void AdicionarRegistro(List<LinhaPlanilha> registros, List<string> celulas, int linha)
    {
        if (celulas.TrueForAll(string.IsNullOrWhiteSpace))
        {
            return;
        }

        if (registros.Count > LimitesImportacao.LinhasMaximas)
        {
            throw new RegraNegocioException(MensagensImportacaoConvidados.LinhasDemais);
        }

        registros.Add(new LinhaPlanilha(linha, celulas));
    }
}
