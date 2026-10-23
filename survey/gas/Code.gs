/**
 * 糖活ぶっちゃけおしゃべり会 事前アンケート 保存用スクリプト
 * Googleスプレッドシートの「拡張機能 → Apps Script」に貼り付けて使います。
 */
const SHEET_NAME = '回答';

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 回答を受け取って1行追加
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data || !data.answers || !Array.isArray(data.row)) throw new Error('bad request');
    const raw = JSON.stringify({ id: data.id, answers: data.answers });
    if (raw.length > 40000) throw new Error('too large');
    const sh = getSheet_();
    if (sh.getLastRow() === 0) {
      sh.appendRow(data.headers.concat(['（集計用データ・編集しないでください）']));
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, data.headers.length + 1).setFontWeight('bold').setBackground('#e0f7f7');
    }
    sh.appendRow([new Date(), String(data.id)].concat(data.row.map(String)).concat([raw]));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 集計画面用に全回答を返す
function doGet() {
  try {
    const sh = getSheet_();
    const last = sh.getLastRow();
    if (last < 2) return json_({ ok: true, responses: [] });
    const values = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
    const responses = [];
    values.forEach(function (r) {
      try {
        const d = JSON.parse(r[r.length - 1]);
        responses.push({ id: d.id, answers: d.answers, t: r[0] instanceof Date ? r[0].toISOString() : String(r[0]) });
      } catch (e) { /* 空行などは無視 */ }
    });
    return json_({ ok: true, responses: responses });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
