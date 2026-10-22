using Casamento.Dominio.Convidados;

namespace Casamento.Aplicacao.Convidados.Importacao;

public static class AnalisadorImportacaoConvidados
{
    public static AnaliseImportacao Analisar(PlanilhaLida planilha, IReadOnlyList<IdentificacaoConvidado> existentes)
    {
        ArgumentNullException.ThrowIfNull(planilha);
        ArgumentNullException.ThrowIfNull(existentes);

        var colunas = MapeadorColunasImportacao.Mapear(planilha.Cabecalho);
        var linhas = planilha.Linhas.Select(linha => MapeadorColunasImportacao.Aplicar(colunas, linha)).ToList();
        var problemas = new List<ProblemaLinha>();

        foreach (var linha in linhas)
        {
            ValidarLinha(linha, problemas);
        }

        var grupos = Agrupar(linhas);

        foreach (var grupo in grupos)
        {
            ValidarConvite(grupo, problemas);
        }

        DetectarDuplicados(linhas, existentes, problemas);

        var problemasPorLinha = problemas.ToLookup(problema => problema.Linha);
        var convites = grupos.Select(grupo => MontarConvite(grupo, problemasPorLinha)).ToList();

        return new AnaliseImportacao(
            colunas,
            linhas,
            convites,
            problemas.OrderBy(problema => problema.Linha).ThenBy(problema => problema.Tipo).ToList());
    }

    public static SalvarConviteRequest ParaRequest(ConviteAnalisado convite)
    {
        ArgumentNullException.ThrowIfNull(convite);

        return new SalvarConviteRequest(
            convite.Nome,
            convite.Grupo,
            convite.LimiteAcompanhantes,
            convite.Pessoas
                .Select(pessoa => new SalvarConvidadoRequest(null, pessoa.Nome, pessoa.Telefone, pessoa.Email, pessoa.FaixaEtaria, pessoa.Resposta))
                .ToList());
    }

    private static void ValidarLinha(LinhaImportacao linha, List<ProblemaLinha> problemas)
    {
        var numero = linha.Numero;
        var nome = NormalizadorTexto.Normalizar(linha.Valor(ColunaImportacao.Nome));

        if (nome is null)
        {
            problemas.Add(Erro(numero, ColunaImportacao.Nome, MensagensConvidados.NomeObrigatorio));
        }
        else if (nome.Length is < Convidado.TamanhoMinimoNome or > Convidado.TamanhoMaximoNome)
        {
            problemas.Add(Erro(numero, ColunaImportacao.Nome, MensagensConvidados.TamanhoNome));
        }

        var nomeConvite = NormalizadorTexto.Normalizar(linha.Valor(ColunaImportacao.Convite));

        if (nomeConvite is { Length: < Convite.TamanhoMinimoNome or > Convite.TamanhoMaximoNome })
        {
            problemas.Add(Erro(numero, ColunaImportacao.Convite, MensagensConvidados.TamanhoNome));
        }

        var grupo = NormalizadorTexto.Normalizar(linha.Valor(ColunaImportacao.Grupo));

        if (grupo is { Length: > Convite.TamanhoMaximoGrupo })
        {
            problemas.Add(Erro(numero, ColunaImportacao.Grupo, MensagensConvidados.TamanhoGrupo));
        }

        if (!NormalizadorTelefone.Valido(linha.Valor(ColunaImportacao.Telefone)))
        {
            problemas.Add(Erro(numero, ColunaImportacao.Telefone, MensagensConvidados.TelefoneInvalido));
        }

        if (!ValidadorEmailConvidado.Valido(linha.Valor(ColunaImportacao.Email)))
        {
            problemas.Add(Erro(numero, ColunaImportacao.Email, MensagensConvidados.EmailInvalido));
        }

        if (!InterpretadorValoresImportacao.TentarFaixaEtaria(linha.Valor(ColunaImportacao.FaixaEtaria), out _))
        {
            problemas.Add(Erro(numero, ColunaImportacao.FaixaEtaria, MensagensConvidados.FaixaEtariaInvalida));
        }

        if (!InterpretadorValoresImportacao.TentarResposta(linha.Valor(ColunaImportacao.Resposta), out _))
        {
            problemas.Add(Erro(numero, ColunaImportacao.Resposta, MensagensConvidados.RespostaInvalida));
        }

        if (!InterpretadorValoresImportacao.TentarAcompanhantes(linha.Valor(ColunaImportacao.Acompanhantes), out _))
        {
            problemas.Add(Erro(numero, ColunaImportacao.Acompanhantes, MensagensConvidados.LimiteAcompanhantesForaDaFaixa));
        }

        if (nome is not null && nome.Contains(LimitesImportacao.MarcadorExemplo, StringComparison.OrdinalIgnoreCase))
        {
            problemas.Add(new ProblemaLinha(numero, TipoProblemaLinha.Aviso, ColunaImportacao.Nome, MensagensImportacaoConvidados.LinhaExemplo));
        }
    }

    private static List<List<LinhaImportacao>> Agrupar(List<LinhaImportacao> linhas)
    {
        var grupos = new List<List<LinhaImportacao>>();
        var indices = new Dictionary<string, int>(StringComparer.Ordinal);

        foreach (var linha in linhas)
        {
            var chave = ChaveComparacaoConvidado.Texto(linha.Valor(ColunaImportacao.Convite));

            if (chave is null)
            {
                grupos.Add([linha]);
                continue;
            }

            if (indices.TryGetValue(chave, out var indice))
            {
                grupos[indice].Add(linha);
                continue;
            }

            indices[chave] = grupos.Count;
            grupos.Add([linha]);
        }

        return grupos;
    }

    private static void ValidarConvite(List<LinhaImportacao> linhas, List<ProblemaLinha> problemas)
    {
        if (linhas.Count > Convite.ConvidadosMaximo)
        {
            foreach (var linha in linhas)
            {
                problemas.Add(Erro(linha.Numero, ColunaImportacao.Convite, MensagensConvidados.QuantidadeConvidados));
            }
        }

        AvisarDivergencias(linhas, ColunaImportacao.Grupo, "Grupo", valor => ChaveComparacaoConvidado.Texto(valor), problemas);
        AvisarDivergencias(
            linhas,
            ColunaImportacao.Acompanhantes,
            "Acompanhantes",
            valor => InterpretadorValoresImportacao.TentarAcompanhantes(valor, out var quantidade) && !string.IsNullOrWhiteSpace(valor)
                ? quantidade.ToString(System.Globalization.CultureInfo.InvariantCulture)
                : null,
            problemas);
    }

    private static void AvisarDivergencias(
        List<LinhaImportacao> linhas,
        ColunaImportacao coluna,
        string rotulo,
        Func<string?, string?> chave,
        List<ProblemaLinha> problemas)
    {
        string? primeira = null;

        foreach (var linha in linhas)
        {
            var atual = chave(linha.Valor(coluna));

            if (atual is null)
            {
                continue;
            }

            if (primeira is null)
            {
                primeira = atual;
                continue;
            }

            if (!string.Equals(primeira, atual, StringComparison.Ordinal))
            {
                problemas.Add(new ProblemaLinha(
                    linha.Numero,
                    TipoProblemaLinha.Aviso,
                    coluna,
                    MensagensImportacaoConvidados.ValorDivergenteConvite(rotulo)));
            }
        }
    }

    private static void DetectarDuplicados(
        List<LinhaImportacao> linhas,
        IReadOnlyList<IdentificacaoConvidado> existentes,
        List<ProblemaLinha> problemas)
    {
        var existentesComTelefone = new HashSet<(string Nome, string Telefone)>();
        var nomesExistentes = new Dictionary<string, bool>(StringComparer.Ordinal);

        foreach (var existente in existentes)
        {
            var nome = ChaveComparacaoConvidado.Texto(existente.Nome);

            if (nome is null)
            {
                continue;
            }

            var telefone = ChaveComparacaoConvidado.Telefone(existente.Telefone);
            RegistrarNome(nomesExistentes, nome, telefone is null);

            if (telefone is not null)
            {
                existentesComTelefone.Add((nome, telefone));
            }
        }

        var primeiraOcorrencia = new Dictionary<(string Nome, string Telefone), int>();
        var nomesPlanilha = new Dictionary<string, bool>(StringComparer.Ordinal);

        foreach (var linha in linhas)
        {
            var nome = ChaveComparacaoConvidado.Texto(linha.Valor(ColunaImportacao.Nome));

            if (nome is null)
            {
                continue;
            }

            var telefone = ChaveComparacaoConvidado.Telefone(linha.Valor(ColunaImportacao.Telefone));

            if (telefone is not null && existentesComTelefone.Contains((nome, telefone)))
            {
                problemas.Add(new ProblemaLinha(linha.Numero, TipoProblemaLinha.Duplicado, null, MensagensImportacaoConvidados.JaCadastrada));
            }
            else if (telefone is not null && primeiraOcorrencia.TryGetValue((nome, telefone), out var original))
            {
                problemas.Add(new ProblemaLinha(linha.Numero, TipoProblemaLinha.Duplicado, null, MensagensImportacaoConvidados.DuplicadaNaPlanilha(original)));
            }
            else if (PossivelDuplicado(nome, telefone is null, nomesExistentes) || PossivelDuplicado(nome, telefone is null, nomesPlanilha))
            {
                problemas.Add(new ProblemaLinha(linha.Numero, TipoProblemaLinha.Aviso, ColunaImportacao.Nome, MensagensImportacaoConvidados.PossivelDuplicado));
            }

            if (telefone is not null)
            {
                primeiraOcorrencia.TryAdd((nome, telefone), linha.Numero);
            }

            RegistrarNome(nomesPlanilha, nome, telefone is null);
        }
    }

    private static void RegistrarNome(Dictionary<string, bool> nomes, string nome, bool semTelefone)
    {
        nomes[nome] = (nomes.TryGetValue(nome, out var algumSemTelefone) && algumSemTelefone) || semTelefone;
    }

    private static bool PossivelDuplicado(string nome, bool semTelefone, Dictionary<string, bool> nomes)
    {
        return nomes.TryGetValue(nome, out var algumSemTelefone) && (semTelefone || algumSemTelefone);
    }

    private static ConviteAnalisado MontarConvite(List<LinhaImportacao> linhas, ILookup<int, ProblemaLinha> problemasPorLinha)
    {
        var pessoas = linhas.Select(linha => MontarPessoa(linha, problemasPorLinha[linha.Numero])).ToList();
        var nome = linhas
            .Select(linha => NormalizadorTexto.Normalizar(linha.Valor(ColunaImportacao.Convite)))
            .FirstOrDefault(valor => valor is not null);
        var grupo = linhas
            .Select(linha => NormalizadorTexto.Normalizar(linha.Valor(ColunaImportacao.Grupo)))
            .FirstOrDefault(valor => valor is not null);
        var acompanhantes = linhas
            .Select(linha => linha.Valor(ColunaImportacao.Acompanhantes))
            .Where(valor => !string.IsNullOrWhiteSpace(valor))
            .Select(valor => InterpretadorValoresImportacao.TentarAcompanhantes(valor, out var quantidade) ? quantidade : Convite.LimiteAcompanhantesMinimo)
            .FirstOrDefault();
        var valido = pessoas.TrueForAll(pessoa => pessoa.Situacao == SituacaoPessoaImportada.Valida);
        var nomeExibicao = nome ?? pessoas.Select(pessoa => pessoa.Nome).FirstOrDefault(valor => valor.Length > 0) ?? string.Empty;

        return new ConviteAnalisado(nome, nomeExibicao, grupo, acompanhantes, pessoas, valido);
    }

    private static PessoaAnalisada MontarPessoa(LinhaImportacao linha, IEnumerable<ProblemaLinha> problemas)
    {
        var tipos = problemas.Select(problema => problema.Tipo).ToHashSet();
        var situacao = tipos.Contains(TipoProblemaLinha.Erro)
            ? SituacaoPessoaImportada.ComErro
            : tipos.Contains(TipoProblemaLinha.Duplicado) ? SituacaoPessoaImportada.Duplicada : SituacaoPessoaImportada.Valida;

        InterpretadorValoresImportacao.TentarFaixaEtaria(linha.Valor(ColunaImportacao.FaixaEtaria), out var faixa);
        InterpretadorValoresImportacao.TentarResposta(linha.Valor(ColunaImportacao.Resposta), out var resposta);

        return new PessoaAnalisada(
            linha.Numero,
            NormalizadorTexto.Normalizar(linha.Valor(ColunaImportacao.Nome)) ?? string.Empty,
            linha.Valor(ColunaImportacao.Telefone),
            linha.Valor(ColunaImportacao.Email),
            faixa,
            resposta,
            situacao);
    }

    private static ProblemaLinha Erro(int linha, ColunaImportacao coluna, string mensagem)
    {
        return new ProblemaLinha(linha, TipoProblemaLinha.Erro, coluna, mensagem);
    }
}
