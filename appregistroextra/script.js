const K = { 
  f: "funcionarios", 
  p: "registrosPonto", 
  u: "usuariosSistema" 
};
const $ = id => document.getElementById(id);

let funcs = JSON.parse(localStorage.getItem(K.f) || "[]");
let pontos = JSON.parse(localStorage.getItem(K.p) || "[]");
let usuarios = JSON.parse(localStorage.getItem(K.u) || "[]");
let ultimoRel = [];

const ADMIN_USER = "admin";
const ADMIN_PASS = "admin@zandona";

const save = () => {
  localStorage.setItem(K.f, JSON.stringify(funcs));
  localStorage.setItem(K.p, JSON.stringify(pontos));
};

const mins = t => {
  if (!t || !t.includes(":")) return 0;
  let [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const diff = (a, b) => {
  if (!a || !b) return 0;
  let x = mins(b) - mins(a);
  return x < 0 ? x + 1440 : x;
};

const hm = n => {
  n = Math.max(0, Math.round(n || 0));
  let h = Math.floor(n / 60);
  let m = n % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const nome = id => (funcs.find(f => f.id == id) || {}).nome || "—";

function parseIntervalo(val) {
  if (val === null || val === undefined) return 0;
  let s = String(val).trim();
  if (!s || s === "0") return 0;
  if (s.includes(":")) {
    let [h, m] = s.split(":").map(Number);
    return (Number.isFinite(h) ? h * 60 : 0) + (Number.isFinite(m) ? m : 0);
  }
  if (/(\d+)\s*h\s*(\d*)/i.test(s)) {
    let match = s.match(/(\d+)\s*h\s*(\d*)/i);
    let h = Number(match[1]) || 0;
    let m = Number(match[2]) || 0;
    return h * 60 + m;
  }
  let n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function total(p) {
  let n = diff(p.entrada, p.saida);
  if (p.intervalo !== undefined && p.intervalo !== null && p.intervalo !== "") {
    n -= parseIntervalo(p.intervalo);
  } else if (p.intSaida && p.intRetorno) {
    n -= diff(p.intSaida, p.intRetorno);
  }
  return Math.max(0, n);
}

function formatIntervalo(p) {
  if (p.intervalo !== undefined && p.intervalo !== null && p.intervalo !== "") {
    let m = parseIntervalo(p.intervalo);
    if (m > 0) {
      return `<span class="badge badge-int">${m} min <span class="badge-sub">(${hm(m)})</span></span>`;
    }
    return `<span class="text-muted">Sem intervalo</span>`;
  }
  if (p.intSaida && p.intRetorno) {
    let m = diff(p.intSaida, p.intRetorno);
    return `<span class="badge badge-int">${p.intSaida} - ${p.intRetorno} <span class="badge-sub">(${hm(m)})</span></span>`;
  }
  return `<span class="text-muted">—</span>`;
}

function fill() {
  const funcSelect = $("funcionario");
  const hFuncSelect = $("hFunc");
  const funcList = $("funcList");

  funcSelect.innerHTML = funcs.length
    ? funcs.map(f => `<option value="${f.id}">${f.nome}</option>`).join("")
    : '<option value="">Cadastre um funcionário primeiro</option>';

  hFuncSelect.innerHTML = '<option value="">Todos</option>' +
    funcs.map(f => `<option value="${f.id}">${f.nome}</option>`).join("");

  funcList.innerHTML = funcs.map(f => `
    <li class="func-item">
      <div class="func-info">
        <span class="avatar-mini">${f.nome.charAt(0).toUpperCase()}</span>
        <span class="func-name">${f.nome}</span>
      </div>
      <button type="button" class="del" data-del="${f.id}" title="Excluir funcionário">Remover</button>
    </li>
  `).join("") || '<li class="empty-msg">Nenhum funcionário cadastrado.</li>';
}

function updateIntervalHint(m) {
  const hint = $("intervaloHint");
  if (!hint) return;
  if (m <= 0) {
    hint.textContent = "Sem intervalo deduzido";
    hint.classList.remove("has-value");
  } else {
    hint.textContent = `Deduzindo ${m} min (${hm(m)})`;
    hint.classList.add("has-value");
  }
}

function updateChipsState(val) {
  const chips = document.querySelectorAll("#intervaloChips .chip");
  chips.forEach(chip => {
    if (+chip.dataset.min === val) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

function updateLivePreview() {
  const ent = $("entrada").value;
  const sai = $("saida").value;
  const intVal = parseIntervalo($("intervalo").value);
  const prevBadge = $("previewTotal");
  const prevDetail = $("previewDetail");
  const prevBox = $("previewBox");

  updateIntervalHint(intVal);
  updateChipsState(intVal);

  if (ent && sai) {
    const bruto = diff(ent, sai);
    const liquido = Math.max(0, bruto - intVal);
    prevBadge.textContent = hm(liquido);

    let desc = `Bruto: ${hm(bruto)}`;
    if (intVal > 0) {
      desc += ` - Intervalo: ${hm(intVal)} = ${hm(liquido)} líquido`;
    }
    if (mins(sai) < mins(ent)) {
      desc += " (virada da noite)";
    }
    prevDetail.textContent = desc;
    prevBox.classList.add("active");
  } else {
    prevBadge.textContent = "00:00";
    prevDetail.textContent = "Informe a entrada e a saída para calcular";
    prevBox.classList.remove("active");
  }
}

function render() {
  let ini = $("hIni").value;
  let fim = $("hFim").value;
  let fu = $("hFunc").value;

  let a = pontos.filter(p => (!ini || p.data >= ini) && (!fim || p.data <= fim) && (!fu || p.funcionarioId == fu))
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);

  $("lista").innerHTML = a.map(p => `
    <tr>
      <td><strong>${p.data.split("-").reverse().join("/")}</strong></td>
      <td>
        <div class="table-user">
          <span class="avatar-cell">${nome(p.funcionarioId).charAt(0).toUpperCase()}</span>
          <span>${nome(p.funcionarioId)}</span>
        </div>
      </td>
      <td><span class="tag-time">${p.entrada}</span></td>
      <td>${formatIntervalo(p)}</td>
      <td><span class="tag-time">${p.saida}</span></td>
      <td><span class="badge-total">${hm(total(p))}</span></td>
      <td class="action-cell"><button type="button" class="del" data-pdel="${p.id}" title="Excluir lançamento">Excluir</button></td>
    </tr>
  `).join("") || '<tr><td colspan="7" class="empty">Nenhum registro encontrado para este filtro.</td></tr>';
}

// Formulário de Funcionários
$("formFunc").onsubmit = e => {
  e.preventDefault();
  let n = $("nome").value.trim();
  if (!n) return;
  if (funcs.some(f => f.nome.toLowerCase() === n.toLowerCase())) {
    return alert("Funcionário já cadastrado.");
  }
  funcs.push({ id: Date.now(), nome: n });
  save();
  e.target.reset();
  fill();
  render();
};

$("funcList").onclick = e => {
  let id = e.target.dataset.del;
  if (id && confirm("Remover funcionário? Os registros antigos serão mantidos.")) {
    funcs = funcs.filter(f => f.id != id);
    save();
    fill();
    render();
  }
};

// Eventos de clique nos chips de intervalo
document.querySelectorAll("#intervaloChips .chip").forEach(btn => {
  btn.onclick = () => {
    $("intervalo").value = btn.dataset.min;
    updateLivePreview();
  };
});

// Eventos de alteração dos inputs para cálculo ao vivo
["entrada", "saida", "intervalo"].forEach(id => {
  const el = $(id);
  if (el) {
    el.addEventListener("input", updateLivePreview);
    el.addEventListener("change", updateLivePreview);
  }
});

// Lançamento do ponto
$("formPonto").onsubmit = e => {
  e.preventDefault();
  let funcId = +$("funcionario").value;
  let dataVal = $("data").value;
  let entradaVal = $("entrada").value;
  let saidaVal = $("saida").value;
  let intervaloVal = parseIntervalo($("intervalo").value);

  if (!funcId || !dataVal || !entradaVal || !saidaVal) {
    return alert("Por favor, preencha todos os campos obrigatórios.");
  }

  let jornadaBruta = diff(entradaVal, saidaVal);
  if (intervaloVal >= jornadaBruta) {
    return alert(`O intervalo (${intervaloVal} min) não pode ser maior ou igual ao período trabalhado (${jornadaBruta} min).`);
  }

  let p = {
    id: Date.now(),
    funcionarioId: funcId,
    data: dataVal,
    entrada: entradaVal,
    saida: saidaVal,
    intervalo: intervaloVal
  };

  pontos.push(p);
  save();

  let totalStr = hm(total(p));
  alert(`Registro salvo com sucesso!\nTotal de horas: ${totalStr}`);

  // Reseta campos mantendo a data de hoje
  $("entrada").value = "";
  $("saida").value = "";
  $("intervalo").value = "0";
  updateLivePreview();
  render();
};

$("filtrar").onclick = render;

$("lista").onclick = e => {
  let id = e.target.dataset.pdel;
  if (id && confirm("Excluir este registro de ponto?")) {
    pontos = pontos.filter(p => p.id != id);
    save();
    render();
  }
};

// Relatório
$("gerar").onclick = () => {
  let ini = $("rIni").value;
  let fim = $("rFim").value;
  if (!ini || !fim) return alert("Informe a data inicial e final do período.");

  let mapa = {};
  pontos.filter(p => p.data >= ini && p.data <= fim).forEach(p => {
    mapa[p.funcionarioId] = (mapa[p.funcionarioId] || 0) + total(p);
  });

  ultimoRel = Object.entries(mapa).map(([id, t]) => ({
    nome: nome(id),
    dias: pontos.filter(p => p.funcionarioId == id && p.data >= ini && p.data <= fim).length,
    total: t
  })).sort((a, b) => a.nome.localeCompare(b.nome));

  let tot = ultimoRel.reduce((s, x) => s + x.total, 0);

  $("resumo").innerHTML = `
    <div class="relatorio-resumo-card">
      <div class="total-geral-box">
        <span class="total-geral-label">Total geral do período</span>
        <span class="total-geral-value">${hm(tot)}</span>
      </div>
      <table class="rel">
        <thead>
          <tr>
            <th>Funcionário</th>
            <th>Dias trabalhados</th>
            <th>Total de horas</th>
          </tr>
        </thead>
        <tbody>
          ${ultimoRel.map(x => `
            <tr>
              <td><strong>${x.nome}</strong></td>
              <td><span class="tag-dias">${x.dias} ${x.dias === 1 ? 'dia' : 'dias'}</span></td>
              <td><span class="badge-total">${hm(x.total)}</span></td>
            </tr>
          `).join("") || '<tr><td colspan="3" class="empty">Nenhum registro encontrado no período selecionado.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
};

function openPrintableFallback(ini, fim, resumoColabs, totalGeral, registros) {
  let dataIni = ini.split("-").reverse().join("/");
  let dataFim = fim.split("-").reverse().join("/");
  let agora = new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });

  let win = window.open("", "_blank");
  if (!win) return alert("Por favor, autorize pop-ups para abrir o relatório.");

  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório de Horas Trabalhadas</title>
<style>
  body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1d20; margin: 30px; line-height: 1.4; }
  .header-brand { background: #0A2342; color: white; padding: 18px 24px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #e31b23; }
  .brand-title { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin: 0; }
  .brand-subtitle { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85; margin-top: 3px; }
  .report-tag { font-size: 13px; font-weight: 700; text-align: right; background: rgba(255,255,255,0.12); padding: 6px 12px; border-radius: 4px; }
  .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0A2342; padding: 12px 18px; margin: 16px 0 22px; display: flex; justify-content: space-between; align-items: center; border-radius: 0 6px 6px 0; }
  .meta-item { font-size: 12.5px; color: #475569; }
  .meta-item strong { color: #1a1d20; }
  .total-badge-box { background: #edf3fa; border: 1px solid #bacbe6; padding: 6px 14px; border-radius: 6px; text-align: right; }
  .total-badge-label { font-size: 11px; font-weight: 700; color: #0A2342; text-transform: uppercase; }
  .total-badge-val { font-size: 19px; font-weight: 800; color: #0A2342; }
  .sec-title { font-size: 13.5px; font-weight: 700; color: #0A2342; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px; border-bottom: 2px solid #0A2342; display: inline-block; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12.5px; }
  th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
  th { background: #0A2342; color: white; font-weight: 700; }
  .th-dark { background: #1a1d20; color: white; }
  .total-row { background: #edf3fa; font-weight: 700; color: #0A2342; }
  .footer-brand { border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; margin-top: 30px; }
  @media print {
    body { margin: 10mm; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px;">
    <button onclick="window.print()" style="background:#0A2342;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:700;box-shadow:0 2px 4px rgba(10,35,66,0.3);">🖨️ Imprimir / Salvar em PDF</button>
  </div>
  <div class="header-brand">
    <div>
      <div class="brand-title">CONTROLE DE HORÁRIOS</div>
      <div class="brand-subtitle">Registro e Gestão de Jornada</div>
    </div>
    <div class="report-tag">RELATÓRIO DE JORNADA</div>
  </div>
  <div class="meta-box">
    <div>
      <div class="meta-item"><strong>Período pesquisado:</strong> ${dataIni} até ${dataFim}</div>
      <div class="meta-item"><strong>Data de emissão:</strong> ${agora}</div>
      <div class="meta-item"><strong>Colaboradores listados:</strong> ${resumoColabs.length} &nbsp;|&nbsp; <strong>Total de registros:</strong> ${registros.length}</div>
    </div>
    <div class="total-badge-box">
      <div class="total-badge-label">Total Geral</div>
      <div class="total-badge-val">${hm(totalGeral)}</div>
    </div>
  </div>

  <div class="sec-title">1. Resumo por Colaborador</div>
  <table>
    <thead><tr><th>Funcionário</th><th style="text-align:center;width:130px;">Dias Trabalhados</th><th style="text-align:right;width:130px;">Total de Horas</th></tr></thead>
    <tbody>
      ${resumoColabs.map(r => `<tr><td><strong>${r.nome}</strong></td><td style="text-align:center;">${r.dias} dias</td><td style="text-align:right;font-weight:bold;color:#0A2342;">${hm(r.total)}</td></tr>`).join("")}
      <tr class="total-row"><td>TOTAL GERAL</td><td style="text-align:center;">${registros.length} registros</td><td style="text-align:right;">${hm(totalGeral)}</td></tr>
    </tbody>
  </table>

  <div class="sec-title">2. Detalhamento dos Lançamentos</div>
  <table>
    <thead><tr><th class="th-dark" style="text-align:center;width:95px;">Data</th><th class="th-dark">Funcionário</th><th class="th-dark" style="text-align:center;width:75px;">Entrada</th><th class="th-dark" style="text-align:center;width:115px;">Intervalo</th><th class="th-dark" style="text-align:center;width:75px;">Saída</th><th class="th-dark" style="text-align:right;width:80px;">Total</th></tr></thead>
    <tbody>
      ${registros.map(p => {
    let intTxt = "Sem intervalo";
    if (p.intervalo != null && p.intervalo !== "") {
      let m = parseIntervalo(p.intervalo);
      intTxt = m > 0 ? `${m} min (${hm(m)})` : "Sem intervalo";
    } else if (p.intSaida && p.intRetorno) {
      intTxt = `${p.intSaida} - ${p.intRetorno}`;
    }
    return `<tr><td style="text-align:center;">${p.data.split("-").reverse().join("/")}</td><td>${nome(p.funcionarioId)}</td><td style="text-align:center;">${p.entrada}</td><td style="text-align:center;">${intTxt}</td><td style="text-align:center;">${p.saida}</td><td style="text-align:right;font-weight:bold;color:#0A2342;">${hm(total(p))}</td></tr>`;
  }).join("")}
    </tbody>
  </table>

  <div class="footer-brand">
    <div>Controle e Gestão de Horários</div>
    <div>Documento oficial para simples conferência</div>
  </div>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

$("gerarPdf").onclick = () => {
  let ini = $("rIni").value;
  let fim = $("rFim").value;
  if (!ini || !fim) return alert("Informe a data inicial e final do período.");

  let registrosPeriodo = pontos.filter(p => p.data >= ini && p.data <= fim)
    .sort((a, b) => a.data.localeCompare(b.data) || a.entrada.localeCompare(b.entrada));

  if (!registrosPeriodo.length) {
    return alert("Nenhum registro encontrado no período selecionado.");
  }

  let mapa = {};
  registrosPeriodo.forEach(p => {
    mapa[p.funcionarioId] = (mapa[p.funcionarioId] || 0) + total(p);
  });

  let resumoColabs = Object.entries(mapa).map(([id, t]) => ({
    nome: nome(id),
    dias: registrosPeriodo.filter(p => p.funcionarioId == id).length,
    total: t
  })).sort((a, b) => a.nome.localeCompare(b.nome));

  let tot = resumoColabs.reduce((s, x) => s + x.total, 0);

  if (window.jspdf && window.jspdf.jsPDF) {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Paleta com Azul #0A2342 predominante e toques equilibrados
      const COR_AZUL     = [10, 35, 66];    // #0A2342 (Azul Marinho Principal)
      const COR_VERMELHO = [227, 27, 35];   // #e31b23 (Faixa sutil de detalhe)
      const COR_GRAFITE  = [26, 29, 32];    // #1a1d20
      const COR_CINZA    = [71, 85, 105];   // #475569
      const COR_FUNDO_TOT= [237, 242, 249]; // #edf3fa (Azul bem suave)
      const COR_BORDA_TOT= [186, 203, 230]; // #bacbe6

      // Faixa Superior Principal em Azul #0A2342
      doc.setFillColor(...COR_AZUL);
      doc.rect(0, 0, 210, 22, "F");

      // Faixa Fina Vermelha de acabamento sutil
      doc.setFillColor(...COR_VERMELHO);
      doc.rect(0, 22, 210, 1.5, "F");

      // Título à esquerda
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("CONTROLE DE HORÁRIOS", 14, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(215, 225, 240);
      doc.text("REGISTRO E GESTÃO DE JORNADA", 14, 17);

      // Título do Relatório à direita no cabeçalho
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(255, 255, 255);
      doc.text("RELATÓRIO DE HORAS TRABALHADAS", 196, 14, { align: "right" });

      let dataIni = ini.split("-").reverse().join("/");
      let dataFim = fim.split("-").reverse().join("/");
      let agora = new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      // Card / Box de Metadados com barra lateral em Azul #0A2342
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 27, 182, 17, 1.5, 1.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, 27, 182, 17, 1.5, 1.5, "S");

      // Barra lateral Azul #0A2342 de destaque no card
      doc.setFillColor(...COR_AZUL);
      doc.rect(14, 27, 2.5, 17, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...COR_CINZA);
      doc.text(`Período pesquisado: `, 20, 33);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COR_AZUL);
      doc.text(`${dataIni} a ${dataFim}`, 50, 33);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COR_CINZA);
      doc.text(`Emissão: `, 20, 39);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COR_GRAFITE);
      doc.text(`${agora}`, 35, 39);

      // Caixa de Total Geral no topo à direita em tons de Azul
      doc.setFillColor(...COR_FUNDO_TOT);
      doc.roundedRect(146, 29, 46, 13, 1, 1, "F");
      doc.setDrawColor(...COR_BORDA_TOT);
      doc.roundedRect(146, 29, 46, 13, 1, 1, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...COR_AZUL);
      doc.text("TOTAL GERAL", 169, 33.5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...COR_AZUL);
      doc.text(`${hm(tot)}`, 169, 39.5, { align: "center" });

      // 1. Seção: Resumo por Funcionário
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...COR_AZUL);
      doc.text("1. Resumo por Funcionário", 14, 51);

      // Linha decorativa abaixo do título em Azul #0A2342
      doc.setDrawColor(...COR_AZUL);
      doc.setLineWidth(0.8);
      doc.line(14, 52.5, 60, 52.5);

      const summaryRows = resumoColabs.map(r => [
        r.nome,
        `${r.dias} ${r.dias === 1 ? 'dia' : 'dias'}`,
        hm(r.total)
      ]);
      summaryRows.push(["TOTAL GERAL", `${registrosPeriodo.length} registros`, hm(tot)]);

      doc.autoTable({
        startY: 55,
        head: [["Funcionário", "Dias Trabalhados", "Total de Horas"]],
        body: summaryRows,
        theme: "striped",
        headStyles: {
          fillColor: COR_AZUL,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
          cellPadding: 2.5
        },
        styles: { fontSize: 8.5, cellPadding: 2.2, textColor: COR_GRAFITE },
        columnStyles: {
          0: { cellWidth: 105, fontStyle: "bold" },
          1: { cellWidth: 40, halign: "center" },
          2: { cellWidth: 37, halign: "right", fontStyle: "bold", textColor: COR_AZUL }
        },
        didParseCell: function (data) {
          if (data.row.index === summaryRows.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = COR_FUNDO_TOT;
            data.cell.styles.textColor = COR_AZUL;
          }
        }
      });

      // 2. Seção: Detalhamento dos Registros
      let nextY = doc.lastAutoTable.finalY + 9;
      if (nextY > 235) {
        doc.addPage();
        nextY = 22;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...COR_AZUL);
      doc.text("2. Detalhamento dos Lançamentos no Período", 14, nextY);

      doc.setDrawColor(...COR_AZUL);
      doc.setLineWidth(0.8);
      doc.line(14, nextY + 1.5, 85, nextY + 1.5);

      const detailRows = registrosPeriodo.map(p => {
        let intTxt = "—";
        if (p.intervalo !== undefined && p.intervalo !== null && p.intervalo !== "") {
          let m = parseIntervalo(p.intervalo);
          intTxt = m > 0 ? `${m}m (${hm(m)})` : "0 min";
        } else if (p.intSaida && p.intRetorno) {
          intTxt = `${p.intSaida}-${p.intRetorno}`;
        }
        return [
          p.data.split("-").reverse().join("/"),
          nome(p.funcionarioId),
          p.entrada,
          intTxt,
          p.saida,
          hm(total(p))
        ];
      });

      doc.autoTable({
        startY: nextY + 4,
        head: [["Data", "Funcionário", "Entrada", "Intervalo", "Saída", "Total"]],
        body: detailRows,
        theme: "grid",
        headStyles: {
          fillColor: COR_AZUL,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
          cellPadding: 2.5
        },
        styles: { fontSize: 8, cellPadding: 2, textColor: COR_GRAFITE },
        columnStyles: {
          0: { halign: "center", cellWidth: 26 },
          1: { cellWidth: 60, fontStyle: "bold" },
          2: { halign: "center", cellWidth: 22 },
          3: { halign: "center", cellWidth: 32 },
          4: { halign: "center", cellWidth: 22 },
          5: { halign: "right", cellWidth: 20, fontStyle: "bold", textColor: COR_AZUL }
        }
      });

      // Rodapé institucional e paginação em todas as páginas
      const totalPaginas = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, 287, 196, 287);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Controle e Registro de Jornada  •  Documento gerado eletronicamente", 14, 291);
        doc.text(`Página ${i} de ${totalPaginas}`, 196, 291, { align: "right" });
      }

      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const newWin = window.open(pdfUrl, "_blank");
      if (!newWin) {
        alert("Pop-up bloqueado pelo navegador. Por favor, autorize a abertura de novas guias para visualizar o PDF.");
      }
      return;
    } catch (err) {
      console.warn("Falha ao gerar via jsPDF, usando relatório imprimível:", err);
    }
  }

  openPrintableFallback(ini, fim, resumoColabs, tot, registrosPeriodo);
};

// ==========================================================================
// FUNÇÕES AUXILIARES E GERENCIAMENTO DE LOGINS
// ==========================================================================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function salvarUsuarios() {
  localStorage.setItem(K.u, JSON.stringify(usuarios));
}

function renderUsuarios() {
  const tbody = $("listaUsuarios");
  if (!tbody) return;

  // Linha fixa do Administrador Mestre
  let html = `
    <tr>
      <td><strong>admin</strong></td>
      <td><span class="badge-admin">Administrador</span></td>
      <td>Fixo do sistema</td>
      <td style="text-align: right;"><span class="text-muted" style="font-size: 12px; font-weight: 600;">Padrão</span></td>
    </tr>
  `;

  // Linhas dos demais logins cadastrados
  usuarios.forEach(u => {
    html += `
      <tr>
        <td><strong>${escapeHtml(u.usuario)}</strong></td>
        <td><span class="badge-user">Usuário Comum</span></td>
        <td>${escapeHtml(u.criadoEm || "—")}</td>
        <td style="text-align: right;">
          <button type="button" class="del" onclick="removerUsuario('${u.id}')" title="Excluir este login">Excluir</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

window.removerUsuario = function(id) {
  const user = usuarios.find(u => u.id === id);
  if (!user) return;
  if (!confirm(`Deseja realmente excluir o login "${user.usuario}"?`)) return;

  usuarios = usuarios.filter(u => u.id !== id);
  salvarUsuarios();
  renderUsuarios();
  mostrarFeedbackUsuario(`Login "${user.usuario}" removido com sucesso!`, "success");
};

function mostrarFeedbackUsuario(msg, tipo = "success") {
  const fb = $("userFeedback");
  if (!fb) return;
  fb.textContent = msg;
  fb.className = `alert-box alert-${tipo}`;
  fb.style.display = "block";
  setTimeout(() => {
    fb.style.display = "none";
  }, 4000);
}

// Cadastro de novo login
const formNovoLogin = $("formNovoLogin");
if (formNovoLogin) {
  formNovoLogin.onsubmit = e => {
    e.preventDefault();
    const inputUser = $("novoLoginUsuario");
    const inputPass = $("novoLoginSenha");
    const userVal = (inputUser.value || "").trim();
    const passVal = (inputPass.value || "").trim();

    if (!userVal || !passVal) {
      mostrarFeedbackUsuario("Informe o nome de usuário e a senha.", "error");
      return;
    }

    if (userVal.toLowerCase() === ADMIN_USER.toLowerCase()) {
      mostrarFeedbackUsuario("O login 'admin' é reservado para o administrador mestre.", "error");
      return;
    }

    const jaExiste = usuarios.some(u => u.usuario.toLowerCase() === userVal.toLowerCase());
    if (jaExiste) {
      mostrarFeedbackUsuario(`O login "${userVal}" já existe. Escolha outro nome.`, "error");
      return;
    }

    usuarios.push({
      id: "u_" + Date.now(),
      usuario: userVal,
      senha: passVal,
      criadoEm: new Date().toLocaleDateString("pt-BR")
    });

    salvarUsuarios();
    renderUsuarios();
    formNovoLogin.reset();
    inputUser.focus();
    mostrarFeedbackUsuario(`Login "${userVal}" cadastrado com sucesso!`, "success");
  };
}

// ==========================================================================
// AUTENTICAÇÃO E SESSÃO
// ==========================================================================
function ativarAba(tabId) {
  document.querySelectorAll(".tab, .tela").forEach(x => x.classList.remove("active"));
  const btnTab = document.querySelector(`.tab[data-tab="${tabId}"]`);
  const secTela = $(tabId);
  if (btnTab) btnTab.classList.add("active");
  if (secTela) secTela.classList.add("active");
  if (tabId === "historico") render();
  if (tabId === "usuarios") renderUsuarios();
}

function aplicarSessao(sessao) {
  const telaLogin = $("telaLogin");
  const appMain = $("appMain");
  const tabUsuarios = $("tabUsuarios");
  const userNameDisplay = $("userNameDisplay");

  if (!sessao) {
    if (telaLogin) telaLogin.style.display = "flex";
    if (appMain) appMain.style.display = "none";
    if ($("loginUsuario")) $("loginUsuario").value = "";
    if ($("loginSenha")) $("loginSenha").value = "";
    if ($("loginFeedback")) $("loginFeedback").style.display = "none";
    return;
  }

  // Sessão ativa
  if (telaLogin) telaLogin.style.display = "none";
  if (appMain) appMain.style.display = "block";

  if (userNameDisplay) {
    userNameDisplay.textContent = sessao.isAdmin 
      ? "admin (Administrador)" 
      : sessao.usuario;
  }

  if (sessao.isAdmin) {
    if (tabUsuarios) tabUsuarios.style.display = "inline-block";
    renderUsuarios();
  } else {
    if (tabUsuarios) tabUsuarios.style.display = "none";
  }
}

// Estado de sessão em memória (não persiste após F5 ou fechar o navegador)
let sessaoAtual = null;

// Formulário de Login
const formLogin = $("formLogin");
if (formLogin) {
  formLogin.onsubmit = e => {
    e.preventDefault();
    const uVal = ($("loginUsuario").value || "").trim();
    const pVal = ($("loginSenha").value || "").trim();
    const fb = $("loginFeedback");

    // 1. Verificação de Administrador
    if (uVal.toLowerCase() === ADMIN_USER.toLowerCase() && pVal === ADMIN_PASS) {
      sessaoAtual = { usuario: "admin", isAdmin: true };
      fb.style.display = "none";
      aplicarSessao(sessaoAtual);
      ativarAba("usuarios"); // Vai direto para gerenciar logins
      return;
    }

    // 2. Verificação de Usuário Comum cadastrado
    const userFound = usuarios.find(
      u => u.usuario.toLowerCase() === uVal.toLowerCase() && u.senha === pVal
    );

    if (userFound) {
      sessaoAtual = { usuario: userFound.usuario, isAdmin: false };
      fb.style.display = "none";
      aplicarSessao(sessaoAtual);
      ativarAba("ponto"); // Vai para lançar horas
      return;
    }

    // 3. Credenciais inválidas
    fb.textContent = "Usuário ou senha incorretos.";
    fb.style.display = "flex";
    $("loginSenha").value = "";
    $("loginSenha").focus();
  };
}

// Botão Sair (Logout)
const btnLogout = $("btnLogout");
if (btnLogout) {
  btnLogout.onclick = () => {
    sessaoAtual = null;
    aplicarSessao(null);
  };
}

// Navegação por abas
document.querySelectorAll(".tab").forEach(b => {
  b.onclick = () => {
    ativarAba(b.dataset.tab);
  };
});

// Inicialização geral
$("data").value = new Date().toISOString().slice(0, 10);
fill();
render();
updateLivePreview();

// Remove qualquer sessão anterior salva para garantir que F5/reiniciar sempre exija login
localStorage.removeItem("sessaoAtiva");
aplicarSessao(null);