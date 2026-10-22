using Celebri.Dominio.Excecoes;

namespace Celebri.Dominio.Organizacoes;

public class Organizacao
{
    public const int TamanhoMinimoNome = 2;
    public const int TamanhoMaximoNome = 120;

    private Organizacao()
    {
        Nome = string.Empty;
    }

    public Guid Id { get; private set; }

    public string Nome { get; private set; }

    public DateTimeOffset CriadaEm { get; private set; }

    public DateTimeOffset? ModeloChecklistSugeridoEm { get; private set; }

    public bool PossuiModeloChecklistSugerido => ModeloChecklistSugeridoEm is not null;

    public void RegistrarModeloChecklistSugerido(DateTimeOffset agora)
    {
        ModeloChecklistSugeridoEm ??= agora;
    }

    public DateTimeOffset? ModeloCronogramaSugeridoEm { get; private set; }

    public bool PossuiModeloCronogramaSugerido => ModeloCronogramaSugeridoEm is not null;

    public void RegistrarModeloCronogramaSugerido(DateTimeOffset agora)
    {
        ModeloCronogramaSugeridoEm ??= agora;
    }

    public static Organizacao Criar(string nome, DateTimeOffset agora)
    {
        var nomeNormalizado = (nome ?? string.Empty).Trim();

        if (nomeNormalizado.Length is < TamanhoMinimoNome or > TamanhoMaximoNome)
        {
            throw new RegraNegocioException(
                $"O nome da assessoria deve ter entre {TamanhoMinimoNome} e {TamanhoMaximoNome} caracteres.");
        }

        return new Organizacao
        {
            Id = Guid.NewGuid(),
            Nome = nomeNormalizado,
            CriadaEm = agora,
        };
    }
}
