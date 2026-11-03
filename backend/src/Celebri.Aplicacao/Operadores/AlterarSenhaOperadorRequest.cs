using System.ComponentModel.DataAnnotations;
using Celebri.Aplicacao.Autenticacao;

namespace Celebri.Aplicacao.Operadores;

public sealed record AlterarSenhaOperadorRequest(
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(MensagensValidacao.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string SenhaAtual,
    [Required(ErrorMessage = MensagensValidacao.Obrigatorio)]
    [StringLength(MensagensValidacao.TamanhoMaximoEntrada, ErrorMessage = MensagensValidacao.EntradaMuitoLonga)]
    string NovaSenha);
