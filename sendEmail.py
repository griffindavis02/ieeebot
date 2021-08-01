import smtplib
import os
import sys
import json
from dotenv import load_dotenv
from email.message import EmailMessage

load_dotenv()
with open('./accounts.json', 'rb') as f:
    file_data = f.read()
accounts = json.load(open('accounts.json'))

msg = EmailMessage()
msg['Subject'] = 'Follow Bot Has Finished'
msg['From'] = os.getenv('GM_USERNAME')
msg['To'] = os.getenv('GM_RECIPIENT')
body = f'Follow bot has finished following {len(accounts)} accounts'
msg.set_content(body)
msg.add_attachment(file_data, maintype='application', subtype='octet-stream', filename='accounts.json')

with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
    smtp.login(os.getenv('GM_USERNAME'), os.getenv('GM_PASSWORD'))
    smtp.send_message(msg)

f.close()

sys.stdout.flush()