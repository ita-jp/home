import 'google-apps-script';

const REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

function doGet() {
}

function doPost(e: GoogleAppsScript.Events.DoPost, channelAccessToken: string, channelSecret: string, spreadSheetId: string) {
  return reply(e, channelAccessToken, channelSecret, spreadSheetId);
}

function reply(e: GoogleAppsScript.Events.DoPost, channelAccessToken: string, chanelSecret: string, spreadSheetId: string) {
  new AccessLogRepository(spreadSheetId).insert();

  var event = JSON.parse(e.postData.contents).events[0],
      replyToken = event.replyToken,
      message = event.message.text,
      price = parseInt(message),
      lines = message.slice(price.toString().length).trim().split('\n'),
      purpose = lines.length > 0 ? lines[0] : '',
      memo = lines.length > 1 ? lines.slice(1).join('\n') : '';


  insertCreditCardUsage(new Date(event.timestamp), event.source.userId, purpose, price, memo, spreadSheetId);

  UrlFetchApp.fetch(REPLY_URL, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + channelAccessToken,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'replyToken': replyToken,
      'messages': [{
        'type': 'text',
        'text': `【登録内容】\n項目：${purpose}\n金額：${price}円\nメモ：\n${memo}\n\n【残りの予算】\n${createBudgetSummary(spreadSheetId)}`,
      }],
    }),
    });
  return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
}

function createBudgetSummary(spreadSheetId: string) {
  var spreadSheet = SpreadsheetApp.openById(spreadSheetId),
      sheet = spreadSheet.getSheetByName('_workspace'),
      budgets = sheet.getRange(2, 1, 6, 5).getValues();
  return budgets.map(line => `${line[0]}: ${line[4]}円`).join('\n');
}

function insertCreditCardUsage(timestamp, user, purpose, price, memo, spreadSheetId: string) {
  var spreadsheet = SpreadsheetApp.openById(spreadSheetId),
      accessLogSheet = spreadsheet.getSheetByName('credit_card_usage');
  accessLogSheet.appendRow([timestamp, user, purpose, price, memo]);
}


class AccessLogRepository {
  constructor(private spreadSheetId: string) {
  }
  private appendRow(row: any) {
    SpreadsheetApp.openById(this.spreadSheetId).getSheetByName('access_log').appendRow(row);
  }
  insert() {
    var date = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd hh:mm:ss');
    this.appendRow([date]);
  }
}
