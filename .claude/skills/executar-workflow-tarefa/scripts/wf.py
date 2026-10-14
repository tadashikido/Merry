import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
DIRETORIO_ESTADO = os.path.join(tempfile.gettempdir(), "specflow-wf")

USO = """uso: wf.py <comando> [args]

leitura
  constituicao
  workflow                                   workflow ativo, steps resumidos
  step <stepId>                              step completo com inputTemplate
  agente <nome>                              promptSistema + modeloSpec do agente
  kanban
  tarefa <tarefaId>
  specs <tarefaId>
  render <tarefaId> <stepId>                 inputTemplate com placeholders resolvidos

escrita
  iniciar <tarefaId> <nomeAgente> <stepId>
  spec <tarefaId> <tipoSpec> <criadoPorAgente> <arquivo>
  concluir <tarefaId> <execucaoId> <tokIn> <tokOut> <duracaoMs|auto> [tipoSpec]
  mover <tarefaId> <coluna>
  bloquear <tarefaId> <motivo>
  tarefa-nova <arquivoJson>
  branch <tarefaId> <nomeBranch> <branchBase>
  pr <tarefaId> <url> <numero> <status>
"""


def configuracao():
    faltando = [v for v in ("SPECFLOW_API", "SPECFLOW_KEY", "SPECFLOW_PROJETO") if not os.environ.get(v)]
    if faltando:
        sys.exit(f"erro: variáveis de ambiente ausentes: {', '.join(faltando)} (valores em CLAUDE.md)")
    return os.environ["SPECFLOW_API"].rstrip("/"), os.environ["SPECFLOW_KEY"], os.environ["SPECFLOW_PROJETO"]


API = CHAVE = PROJETO = None


def requisitar(metodo, caminho, corpo=None):
    dados = json.dumps(corpo, ensure_ascii=False).encode("utf-8") if corpo is not None else None
    req = urllib.request.Request(f"{API}{caminho}", data=dados, method=metodo)
    req.add_header("X-API-Key", CHAVE)
    req.add_header("User-Agent", USER_AGENT)
    req.add_header("Accept", "application/json")
    if dados is not None:
        req.add_header("Content-Type", "application/json; charset=utf-8")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            texto = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"HTTP {e.code} {metodo} {caminho}\n{e.read().decode('utf-8', 'replace')}\n")
        sys.exit(1)
    except urllib.error.URLError as e:
        sys.exit(f"erro de rede {metodo} {caminho}: {e.reason}")
    if not texto:
        return None
    try:
        return json.loads(texto)
    except json.JSONDecodeError:
        return texto


def imprimir(valor):
    if isinstance(valor, str):
        print(valor)
    else:
        print(json.dumps(valor, ensure_ascii=False, indent=2))


def ler_arquivo(caminho):
    with open(caminho, encoding="utf-8") as f:
        return f.read()


def workflow_ativo():
    lista = requisitar("GET", f"/workflows/projeto/{PROJETO}")
    ativos = [w for w in lista if w.get("ativo")]
    if not ativos:
        sys.exit("erro: nenhum workflow ativo no projeto")
    return ativos[0]


def buscar_step(step_id):
    for s in workflow_ativo()["definicao"]["steps"]:
        if s["id"] == step_id:
            return s
    sys.exit(f"erro: step '{step_id}' não existe no workflow ativo")


def listar_specs(tarefa_id):
    resp = requisitar("GET", f"/especificacoes/tarefa/{tarefa_id}")
    if isinstance(resp, dict):
        resp = resp.get("itens") or resp.get("especificacoes") or []
    return resp or []


def cmd_workflow():
    w = workflow_ativo()
    print(f"# {w.get('nome')} (v{w.get('versao')}) id={w.get('id')}")
    for s in w["definicao"]["steps"]:
        resumo = {k: v for k, v in s.items() if k not in ("inputTemplate", "posicao", "maxParalelos")}
        print(json.dumps(resumo, ensure_ascii=False))


def cmd_agente(nome):
    for a in requisitar("GET", f"/projetos/{PROJETO}/agentes"):
        if a.get("nome") == nome:
            imprimir({k: a.get(k) for k in ("nome", "nomeExibido", "secoesDaConstituicao", "modeloSpec")})
            print("\n## promptSistema\n")
            print(a.get("promptSistema") or "")
            return
    sys.exit(f"erro: agente '{nome}' não encontrado")


def cmd_render(tarefa_id, step_id):
    template = buscar_step(step_id).get("inputTemplate") or ""
    tarefa = requisitar("GET", f"/tarefas/{tarefa_id}") or {}
    mais_recente = {}
    for s in listar_specs(tarefa_id):
        tipo = s.get("tipoSpec") or s.get("tipo")
        if tipo:
            atual = mais_recente.get(tipo)
            if atual is None or str(s.get("criadoEm", "")) >= str(atual.get("criadoEm", "")):
                mais_recente[tipo] = s
    valores = {
        "{tarefaId}": tarefa_id,
        "{titulo}": str(tarefa.get("titulo", "")),
        "{descricao}": str(tarefa.get("descricao", "")),
        "{prioridade}": str(tarefa.get("prioridade", "")),
    }
    for chave, valor in valores.items():
        template = template.replace(chave, valor)
    ausentes = []
    while "{spec:" in template:
        inicio = template.index("{spec:")
        fim = template.index("}", inicio)
        tipo = template[inicio + 6:fim]
        spec = mais_recente.get(tipo)
        if spec is None:
            ausentes.append(tipo)
        conteudo = spec.get("conteudo", "") if spec else f"(spec '{tipo}' ainda não gravada)"
        template = template[:inicio] + conteudo + template[fim + 1:]
    print(template)
    if ausentes:
        sys.stderr.write(f"aviso: specs ausentes: {', '.join(ausentes)}\n")


def cmd_iniciar(tarefa_id, nome_agente, step_id):
    resp = requisitar("POST", f"/tarefas/{tarefa_id}/agente/iniciar", {"nomeAgente": nome_agente, "stepId": step_id})
    execucao_id = (resp or {}).get("execucaoId")
    if execucao_id:
        os.makedirs(DIRETORIO_ESTADO, exist_ok=True)
        with open(os.path.join(DIRETORIO_ESTADO, f"{execucao_id}.json"), "w", encoding="utf-8") as f:
            json.dump({"inicioEpochMs": int(time.time() * 1000), "tarefaId": tarefa_id, "stepId": step_id}, f)
    imprimir(resp)


def duracao_automatica(execucao_id):
    caminho = os.path.join(DIRETORIO_ESTADO, f"{execucao_id}.json")
    if not os.path.exists(caminho):
        sys.exit(f"erro: sem registro de início para {execucao_id}; informe duracaoMs explicitamente")
    with open(caminho, encoding="utf-8") as f:
        inicio = json.load(f)["inicioEpochMs"]
    return int(time.time() * 1000) - inicio, caminho


def cmd_concluir(tarefa_id, execucao_id, tok_in, tok_out, duracao, tipo_spec=None):
    estado = None
    if duracao == "auto":
        duracao_ms, estado = duracao_automatica(execucao_id)
    else:
        duracao_ms = int(duracao)
    corpo = {"execucaoId": execucao_id, "tokensEntrada": int(tok_in), "tokensSaida": int(tok_out), "duracaoMs": duracao_ms}
    if tipo_spec:
        corpo["tipoSpec"] = tipo_spec
    imprimir(requisitar("POST", f"/tarefas/{tarefa_id}/agente/concluir", corpo))
    print(f"duracaoMs={duracao_ms}")
    if estado:
        os.remove(estado)


def cmd_tarefa_nova(arquivo):
    corpo = json.loads(ler_arquivo(arquivo))
    corpo.setdefault("projetoId", PROJETO)
    corpo.setdefault("colunaKanban", "a_fazer")
    imprimir(requisitar("POST", "/tarefas", corpo))


COMANDOS = {
    "constituicao": (0, lambda: imprimir(requisitar("GET", f"/projetos/{PROJETO}/constituicao"))),
    "workflow": (0, cmd_workflow),
    "step": (1, lambda s: imprimir(buscar_step(s))),
    "agente": (1, cmd_agente),
    "kanban": (0, lambda: imprimir(requisitar("GET", f"/tarefas/kanban?projetoId={PROJETO}"))),
    "tarefa": (1, lambda t: imprimir(requisitar("GET", f"/tarefas/{t}"))),
    "specs": (1, lambda t: imprimir(listar_specs(t))),
    "render": (2, cmd_render),
    "iniciar": (3, cmd_iniciar),
    "spec": (4, lambda t, tipo, agente, arq: imprimir(requisitar("POST", "/especificacoes", {
        "tarefaId": t, "tipoSpec": tipo, "conteudo": ler_arquivo(arq), "criadoPorAgente": agente}))),
    "concluir": (5, cmd_concluir),
    "mover": (2, lambda t, c: imprimir(requisitar("PATCH", f"/tarefas/{t}/mover", {"coluna": c}))),
    "bloquear": (2, lambda t, m: imprimir(requisitar("PATCH", f"/tarefas/{t}/bloquear", {"motivo": m}))),
    "tarefa-nova": (1, cmd_tarefa_nova),
    "branch": (3, lambda t, b, base: imprimir(requisitar("PATCH", f"/tarefas/{t}/branch", {
        "nomeBranch": b, "branchBase": base}))),
    "pr": (4, lambda t, url, n, st: imprimir(requisitar("PATCH", f"/tarefas/{t}/pull-request", {
        "urlPullRequest": url, "numeroPullRequest": int(n), "statusPullRequest": st}))),
}


def main():
    global API, CHAVE, PROJETO
    if len(sys.argv) < 2 or sys.argv[1] not in COMANDOS:
        sys.exit(USO)
    nome, args = sys.argv[1], sys.argv[2:]
    minimo, funcao = COMANDOS[nome]
    maximo = minimo + (1 if nome == "concluir" else 0)
    if not minimo <= len(args) <= maximo:
        sys.exit(USO)
    API, CHAVE, PROJETO = configuracao()
    funcao(*args)


if __name__ == "__main__":
    main()
