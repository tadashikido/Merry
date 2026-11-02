using Celebri.Aplicacao.Autenticacao.Portas;
using Celebri.Aplicacao.Persistencia;
using Celebri.Dominio.Operadores;
using Celebri.Dominio.Usuarios;
using Microsoft.Extensions.Options;

namespace Celebri.Aplicacao.Operadores;

public class ProvisionamentoOperadorService : IProvisionamentoOperadorService
{
    private readonly IOperadorPlataformaRepository _operadorRepository;
    private readonly IUnidadeTrabalho _unidadeTrabalho;
    private readonly IHashSenhaService _hashSenhaService;
    private readonly OpcoesOperadorInicial _opcoes;
    private readonly TimeProvider _relogio;

    public ProvisionamentoOperadorService(
        IOperadorPlataformaRepository operadorRepository,
        IUnidadeTrabalho unidadeTrabalho,
        IHashSenhaService hashSenhaService,
        IOptions<OpcoesOperadorInicial> opcoes,
        TimeProvider relogio)
    {
        _operadorRepository = operadorRepository;
        _unidadeTrabalho = unidadeTrabalho;
        _hashSenhaService = hashSenhaService;
        _opcoes = opcoes.Value;
        _relogio = relogio;
    }

    public async Task<bool> ProvisionarInicialAsync(CancellationToken cancelamento)
    {
        if (!_opcoes.Configurado)
        {
            return false;
        }

        var email = NormalizadorEmail.Normalizar(_opcoes.Email);

        if (await _operadorRepository.ExisteEmailAsync(email, cancelamento))
        {
            return false;
        }

        var nome = string.IsNullOrWhiteSpace(_opcoes.Nome) ? "Operador" : _opcoes.Nome;
        var operador = OperadorPlataforma.Criar(nome, email, _hashSenhaService.GerarHash(_opcoes.Senha), _relogio.GetUtcNow());

        _operadorRepository.Adicionar(operador);
        await _unidadeTrabalho.SalvarAsync(cancelamento);
        return true;
    }
}
