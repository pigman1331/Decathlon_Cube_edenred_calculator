/**
 * 內湖二手市集盤點｜多機同步後端（Google Apps Script）
 * 第一次執行會自動建立：試算表「二手市集盤點_內湖_日期」＋ Drive 資料夾「二手市集盤點照片」
 * 部署：部署 → 新增部署作業 → 類型「網頁應用程式」→ 執行身分「我」→ 存取權「任何人」
 */
var TZ = 'Asia/Taipei';

function props_() { return PropertiesService.getScriptProperties(); }

function sheet_() {
  var p = props_(), id = p.getProperty('SID'), ss;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('二手市集盤點_內湖_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd'));
    p.setProperty('SID', ss.getId());
    var sh = ss.getSheets()[0];
    sh.setName('scans');
    sh.appendRow(['商品編號', '區域/人員', '裝置', '掃描時間', '照片', '來源', '重複掃描', 't']);
    sh.setFrozenRows(1);
    sh.hideColumns(8);
  }
  return ss.getSheetByName('scans');
}

function folder_() {
  var p = props_(), id = p.getProperty('FID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('二手市集盤點照片_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMdd'));
  p.setProperty('FID', f.getId());
  return f;
}

function itemsSheet_() {
  var ss = sheet_().getParent();
  return ss.getSheetByName('items') || ss.insertSheet('items');
}

function fmt_(t) { return Utilities.formatDate(new Date(Number(t) || Date.now()), TZ, 'MM/dd HH:mm:ss'); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** 讀取全部掃描紀錄 */
function doGet(e) {
  try {
    var act = (e && e.parameter && e.parameter.action) || 'list';
    if (act === 'items') {
      var iv = itemsSheet_().getDataRange().getValues(), items = [];
      for (var k = 1; k < iv.length; k++) {
        var q = iv[k]; if (!q[0]) continue;
        items.push({ id: String(q[0]), card: String(q[1]), name: String(q[2]),
          orig: q[3] === '' ? null : Number(q[3]), price: q[4] === '' ? null : Number(q[4]),
          time: String(q[5]), noTag: String(q[6]) === '吊牌未列印' });
      }
      var meta = null; try { meta = JSON.parse(props_().getProperty('ITEMS_META') || 'null'); } catch (e3) {}
      return out_({ ok: true, items: items, meta: meta, ver: props_().getProperty('ITEMS_VER') || '' });
    }
    var sh = sheet_();
    var v = sh.getDataRange().getValues();
    var rows = [];
    for (var i = 1; i < v.length; i++) {
      var r = v[i]; if (!r[0]) continue;
      rows.push({
        pid: String(r[0]), who: String(r[1]), device: String(r[2]),
        t: Number(r[7]) || 0, photoUrl: String(r[4] || ''), src: String(r[5] || ''),
        dups: r[6] ? String(r[6]).split('；').map(function (s) { return { who: s }; }) : []
      });
    }
    return out_({ ok: true, rows: rows, sheet: sh.getParent().getUrl(), itemsVer: props_().getProperty('ITEMS_VER') || '' });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

/** 新增掃描 / 刪除掃描 */
function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);

    if (b.action === 'setItems') {
      var lk = LockService.getScriptLock(); lk.waitLock(20000);
      try {
        var ish = itemsSheet_(); ish.clear();
        ish.getRange(1, 1, 1, 7).setValues([['商品編號', '賣家卡號', '名稱', '原價', '牌價', '上架時間', '備註']]);
        var list = b.items || [];
        if (list.length) {
          var rows2 = list.map(function (i) { return [i.id, i.card || '', i.name || '', i.orig == null ? '' : i.orig, i.price == null ? '' : i.price, i.time || '', i.noTag ? '吊牌未列印' : '']; });
          ish.getRange(2, 1, rows2.length, 2).setNumberFormat('@');
          ish.getRange(2, 1, rows2.length, 7).setValues(rows2);
        }
        var ver = String(Date.now());
        props_().setProperty('ITEMS_META', JSON.stringify(b.meta || null));
        props_().setProperty('ITEMS_VER', ver);
        return out_({ ok: true, ver: ver, count: list.length });
      } finally { lk.releaseLock(); }
    }

    var pid = String(b.pid || '').toUpperCase();
    if (!/^[A-Z]-\d{4}-\d{5}[A-Z0-9]{2}$/.test(pid)) return out_({ ok: false, error: '商品編號格式錯誤' });

    // 照片先存（不佔用鎖）
    var url = '';
    if (b.action === 'scan' && b.photo) {
      try {
        var blob = Utilities.newBlob(Utilities.base64Decode(b.photo), 'image/jpeg', pid + '_' + b.t + '.jpg');
        var f = folder_().createFile(blob);
        try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e2) {}
        url = 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w1000';
      } catch (e1) {}
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sh = sheet_();
      var col = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues();
      var idx = -1;
      for (var i = 1; i < col.length; i++) if (String(col[i][0]) === pid) { idx = i; break; }

      if (b.action === 'scan') {
        if (idx > 0) {
          var row = sh.getRange(idx + 1, 1, 1, 8).getValues()[0];
          if (String(row[2]) !== String(b.device)) {
            var g = String(row[6] || '');
            sh.getRange(idx + 1, 7).setValue((g ? g + '；' : '') + b.who + ' ' + fmt_(b.t));
          }
          if (url && !row[4]) sh.getRange(idx + 1, 5).setValue(url);
          return out_({ ok: true, dup: true, first: { who: String(row[1]), device: String(row[2]), t: Number(row[7]) } });
        }
        sh.appendRow([pid, String(b.who || ''), String(b.device || ''), fmt_(b.t), url, String(b.src || 'QR'), '', Number(b.t) || Date.now()]);
        return out_({ ok: true, dup: false });
      }

      if (b.action === 'delete') {
        if (idx > 0) {
          var d = String(sh.getRange(idx + 1, 3).getValue());
          if (d === String(b.device)) sh.deleteRow(idx + 1);
          else return out_({ ok: false, error: '只能刪除自己手機掃的紀錄' });
        }
        return out_({ ok: true });
      }
      return out_({ ok: false, error: '未知動作' });
    } finally { lock.releaseLock(); }
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}

/** 部署前先按一次「執行」這個函式，完成授權並建立試算表／資料夾 */
function setup() {
  var sh = sheet_(); folder_();
  Logger.log('試算表：' + sh.getParent().getUrl());
}
