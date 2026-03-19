/**
 * Google Apps Script — Funções de Gerenciamento de Mídias
 *
 * Adicione estas funções ao seu arquivo gslivepainel.gs e
 * inclua os novos cases no doPost() conforme indicado abaixo.
 *
 * IMPORTANTE: Defina a constante DRIVE_FOLDER_ID com o ID da pasta
 * no Google Drive onde as mídias serão armazenadas.
 */

// ── Constante ─────────────────────────────────────────────────────────────────

/**
 * ID da pasta no Google Drive onde as mídias serão armazenadas.
 * Recomendado: armazene via PropertiesService em vez de hardcoding.
 *   PropertiesService.getScriptProperties().setProperty('DRIVE_FOLDER_ID', 'seu_id');
 */
function getDriveFolderId() {
  var id = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  if (!id) throw new Error('DRIVE_FOLDER_ID não configurado. Configure via PropertiesService.');
  return id;
}

const ABA_MIDIAS = 'MIDIAS'; // Nome da aba na planilha

// ── Cases para adicionar no doPost() ─────────────────────────────────────────
//
//  case 'uploadMidia':
//    return jsonOutput(uploadMidia(body.nome, body.tipo, body.base64));
//
//  case 'deletarMidia':
//    return jsonOutput(deletarMidia(body.id));
//
//  case 'setVideoUrl':
//    return jsonOutput(setVideoUrl(body.url));
//
//  case 'listarMidias':
//    return jsonOutput(listarMidias());
//

// ── Funções ───────────────────────────────────────────────────────────────────

/**
 * Faz upload de uma mídia (base64) para o Google Drive
 * e salva os metadados na aba MIDIAS da planilha.
 *
 * @param {string} nome     Nome original do arquivo
 * @param {string} tipo     'video' | 'pdf' | 'imagem'
 * @param {string} base64   Conteúdo do arquivo em base64
 * @returns {{ ok: boolean, id: string, url: string, driveId: string }}
 */
function uploadMidia(nome, tipo, base64) {
  try {
    var folder = DriveApp.getFolderById(getDriveFolderId());

    var mimeTypes = {
      video:  'video/mp4',
      pdf:    'application/pdf',
      imagem: 'image/jpeg',
      slide:  'image/jpeg'
    };

    // Detecta mime-type pela extensão quando possível
    var ext = (nome || '').split('.').pop().toLowerCase();
    var mimeMap = {
      mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
      pdf: 'application/pdf',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp'
    };
    var mimeType = mimeMap[ext] || mimeTypes[tipo] || 'application/octet-stream';

    // Decodifica base64 e cria o arquivo no Drive
    var decoded = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(decoded, mimeType, nome);
    var file = folder.createFile(blob);

    // Torna o arquivo público (leitura)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var driveId = file.getId();
    // Use direct download URL (accessible with Anyone with link sharing)
    var url = 'https://drive.google.com/uc?id=' + driveId + '&export=download';

    // Salva metadados na planilha
    var sheet = obterOuCriarAba(ABA_MIDIAS);
    var id = Utilities.getUuid();
    var agora = new Date().toISOString();

    sheet.appendRow([id, nome, tipo, url, driveId, agora, '']);

    return { ok: true, id: id, url: url, driveId: driveId };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Remove uma mídia da planilha (e opcionalmente do Drive).
 *
 * @param {string} id  ID da mídia (coluna A da aba MIDIAS)
 * @returns {{ ok: boolean }}
 */
function deletarMidia(id) {
  try {
    var sheet = obterOuCriarAba(ABA_MIDIAS);
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        // Opcional: deletar arquivo do Drive
        var driveId = data[i][4];
        if (driveId) {
          try {
            DriveApp.getFileById(driveId).setTrashed(true);
          } catch (driveErr) {
            console.warn('Erro ao mover arquivo para lixeira:', driveErr.message);
          }
        }
        sheet.deleteRow(i + 1);
        return { ok: true };
      }
    }

    return { ok: false, error: 'Mídia não encontrada' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Define a URL do vídeo de PRÉ-live na configuração.
 *
 * @param {string} url  URL pública do vídeo
 * @returns {{ ok: boolean }}
 */
function setVideoUrl(url) {
  try {
    setConfig('VIDEO_URL', url || '');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Lista todas as mídias cadastradas na aba MIDIAS.
 *
 * @returns {{ ok: boolean, data: Array }}
 */
function listarMidias() {
  try {
    var sheet = obterOuCriarAba(ABA_MIDIAS);
    var data = sheet.getDataRange().getValues();
    var midias = [];

    // Linha 0 = cabeçalho; pula linhas vazias
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      midias.push({
        id:        String(row[0]),
        nome:      String(row[1]),
        tipo:      String(row[2]),
        url:       String(row[3]),
        driveId:   String(row[4]),
        criadoEm: String(row[5]),
        thumbnail: String(row[6] || '')
      });
    }

    return { ok: true, data: midias };
  } catch (e) {
    return { ok: false, error: e.message, data: [] };
  }
}

// ── Utilitário ────────────────────────────────────────────────────────────────

/**
 * Obtém ou cria uma aba na planilha ativa.
 * Adiciona cabeçalho se a aba for nova.
 *
 * @param {string} nome  Nome da aba
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function obterOuCriarAba(nome) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = ss.insertSheet(nome);
    sheet.appendRow(['ID', 'NOME', 'TIPO', 'URL', 'DRIVE_ID', 'CRIADO_EM', 'THUMBNAIL']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Apresentações ─────────────────────────────────────────────────────────────
//
// Cases para adicionar no doPost():
//
//  case 'criarApresentacao':
//    return jsonOutput(criarApresentacao(body.nome, body.totalSlides, body.slidesIds));
//
//  case 'ativarApresentacao':
//    return jsonOutput(ativarApresentacao(body.id));
//
//  case 'deletarApresentacao':
//    return jsonOutput(deletarApresentacao(body.id));
//
//  case 'setSlideAtual':
//    return jsonOutput(setSlideAtual(body.numero));
//
//  case 'proximoSlide':
//    return jsonOutput(proximoSlide());
//
//  case 'slideAnterior':
//    return jsonOutput(slideAnterior());
//
//  case 'listarApresentacoes':
//    return jsonOutput({ ok: true, data: listarApresentacoes() });
//
//  case 'getApresentacaoAtiva':
//    return jsonOutput({ ok: true, data: getApresentacaoAtiva() });
//
// Cases opcionais para adicionar no doGet():
//
//  case 'apresentacoes':
//    return jsonOutput({ ok: true, data: listarApresentacoes() });
//
//  case 'apresentacaoAtiva':
//    return jsonOutput({ ok: true, data: getApresentacaoAtiva() });
//
// Também adicione ao initSistema() para criar a aba automaticamente:
//
//  obterOuCriarAbaApresentacoes();
//

var ABA_APRESENTACOES = 'APRESENTACOES';

/**
 * Cria (ou obtém) a aba APRESENTACOES com o cabeçalho correto.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function obterOuCriarAbaApresentacoes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ABA_APRESENTACOES);
  if (!sheet) {
    sheet = ss.insertSheet(ABA_APRESENTACOES);
    sheet.appendRow(['ID', 'NOME', 'TOTAL_SLIDES', 'SLIDES_IDS', 'DATA', 'ATIVA']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Desativa (ATIVA = 'false') todas as apresentações existentes.
 */
function desativarTodasApresentacoes() {
  var sheet = obterOuCriarAbaApresentacoes();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    sheet.getRange(i + 1, 6).setValue('false');
  }
}

/**
 * Lista todas as apresentações cadastradas.
 * @returns {Array<{id, nome, totalSlides, slidesIds, data, ativa}>}
 */
function listarApresentacoes() {
  var sheet = obterOuCriarAbaApresentacoes();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(function(row) {
    return {
      id:          String(row[0]),
      nome:        String(row[1]),
      totalSlides: Number(row[2]),
      slidesIds:   JSON.parse(row[3] || '[]'),
      data:        row[4],
      ativa:       String(row[5]) === 'true'
    };
  });
}

/**
 * Retorna a apresentação atualmente ativa, ou null.
 * @returns {{id, nome, totalSlides, slidesIds, data, ativa}|null}
 */
function getApresentacaoAtiva() {
  var lista = listarApresentacoes();
  return lista.find(function(a) { return a.ativa; }) || null;
}

/**
 * Cria uma nova apresentação a partir dos IDs de slides já enviados.
 * Ativa-a por padrão e desativa as demais.
 *
 * @param {string}   nome         Nome original do PDF
 * @param {number}   totalSlides  Número de slides
 * @param {string[]} slidesIds    Array de IDs na aba MIDIAS
 * @returns {{ ok: boolean, id: string }}
 */
function criarApresentacao(nome, totalSlides, slidesIds) {
  try {
    var sheet = obterOuCriarAbaApresentacoes();
    var id = Utilities.getUuid();

    desativarTodasApresentacoes();

    sheet.appendRow([
      id,
      nome,
      totalSlides,
      JSON.stringify(slidesIds || []),
      new Date(),
      'true'
    ]);

    setConfig('APRESENTACAO_ATIVA_ID', id);
    setConfig('SLIDE_ATUAL', 1);

    return { ok: true, id: id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Define o número do slide atual da apresentação ativa.
 * @param {number} numero  Número do slide (1-based)
 * @returns {{ ok: boolean, slideAtual?: number }}
 */
function setSlideAtual(numero) {
  try {
    var apres = getApresentacaoAtiva();
    if (!apres) return { ok: false, error: 'Nenhuma apresentação ativa' };
    var num = parseInt(numero, 10);
    if (isNaN(num) || num < 1 || num > apres.totalSlides) {
      return { ok: false, error: 'Slide fora do range' };
    }
    setConfig('SLIDE_ATUAL', num);
    return { ok: true, slideAtual: num };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Avança para o próximo slide.
 * @returns {{ ok: boolean, slideAtual?: number }}
 */
function proximoSlide() {
  try {
    var slideAtual = parseInt(getConfig('SLIDE_ATUAL') || '1', 10);
    return setSlideAtual(slideAtual + 1);
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Volta para o slide anterior.
 * @returns {{ ok: boolean, slideAtual?: number }}
 */
function slideAnterior() {
  try {
    var slideAtual = parseInt(getConfig('SLIDE_ATUAL') || '1', 10);
    return setSlideAtual(slideAtual - 1);
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Ativa a apresentação com o ID informado e desativa as demais.
 * @param {string} id  ID da apresentação
 * @returns {{ ok: boolean }}
 */
function ativarApresentacao(id) {
  try {
    desativarTodasApresentacoes();
    var sheet = obterOuCriarAbaApresentacoes();
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.getRange(i + 1, 6).setValue('true');
        setConfig('APRESENTACAO_ATIVA_ID', id);
        setConfig('SLIDE_ATUAL', 1);
        return { ok: true };
      }
    }
    return { ok: false, error: 'Apresentação não encontrada' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Deleta uma apresentação e todos os slides associados a ela.
 * @param {string} id  ID da apresentação
 * @returns {{ ok: boolean }}
 */
function deletarApresentacao(id) {
  try {
    var sheet = obterOuCriarAbaApresentacoes();
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        var slidesIds = JSON.parse(data[i][3] || '[]');
        slidesIds.forEach(function(slideId) {
          try { deletarMidia(slideId); } catch (e) {}
        });
        sheet.deleteRow(i + 1);
        return { ok: true };
      }
    }
    return { ok: false, error: 'Apresentação não encontrada' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
