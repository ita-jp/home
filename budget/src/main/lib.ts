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
      purpose = message.slice(price.toString().length).trim();

  insertCreditCardUsage(new Date(event.timestamp), event.source.userId, purpose, price, spreadSheetId);

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
        'text': `${purpose}に${price}円の支出を登録しました\n\n【残りの予算】\n${createBudgetSummary(spreadSheetId)}`,
      }],
    }),
    });
  return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
}

function createBudgetSummary(spreadSheetId: string) {
  var spreadSheet = SpreadsheetApp.openById(spreadSheetId),
      sheet = spreadSheet.getSheetByName('_workspace'),
      budgets = sheet.getRange(2, 1, 5, 5).getValues();
  return budgets.map(line => `${line[0]}: ${line[4]}円`).join('\n');
}

function insertCreditCardUsage(timestamp, user, purpose, price, spreadSheetId: string) {
  var spreadsheet = SpreadsheetApp.openById(spreadSheetId),
      accessLogSheet = spreadsheet.getSheetByName('credit_card_usage');
  accessLogSheet.appendRow([timestamp, user, purpose, price]);
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
