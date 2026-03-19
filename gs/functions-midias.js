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
      imagem: 'image/jpeg'
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
