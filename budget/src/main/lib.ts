function doGet() {
}

function doPost(e: string, accessToken: string, spreadSheetId: string) {
  return reply(e, accessToken, spreadSheetId);
}

function reply(e: Object, accessToken: String, spreadSheetId: string) {
  insertAccessLog(e, spreadSheetId);

  var event = JSON.parse(e.postData.contents).events[0],
      replyToken = event.replyToken,
      message = event.message.text,
      price = parseInt(message),
      purpose = message.slice(price.toString().length).trim();

  insertCreditCardUsage(new Date(event.timestamp), event.source.userId, purpose, price, spreadSheetId);
  var rest = selectBudget(spreadSheetId);

  // 応答メッセージ用のAPI URL
  var url = 'https://api.line.me/v2/bot/message/reply';

  UrlFetchApp.fetch(url, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + accessToken,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'replyToken': replyToken,
      'messages': [{
        'type': 'text',
        'text': price + '円を' + purpose + 'に使ったんですね\n今週の残り' + rest + '円です',
      }],
    }),
    });
  return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
}

function selectBudget(spreadSheetId: string) {
  var spreadSheet = SpreadsheetApp.openById(spreadSheetId),
      sheet = spreadSheet.getSheetByName('budget');
  return sheet.getRange("B2").getValue();
}

function insertCreditCardUsage(timestamp, user, purpose, price, spreadSheetId: string) {
  var spreadsheet = SpreadsheetApp.openById(spreadSheetId),
      accessLogSheet = spreadsheet.getSheetByName('credit_card_usage');
  accessLogSheet.appendRow([timestamp, user, purpose, price]);
}

function insertAccessLog(content: string, spreadSheetId: string) {
  var spreadsheet = SpreadsheetApp.openById(spreadSheetId),
      accessLogSheet = spreadsheet.getSheetByName('access_log');

  var date = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd hh:mm:ss');
  accessLogSheet.appendRow([date, content]);
}