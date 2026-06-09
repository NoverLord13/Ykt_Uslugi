import random
import datetime


sms_storage = {}

def generate_sms_code()-> str:
    return str(random.randint(1000, 9999))

async def send_sms_gateway(phone: str):
    #logika
    print(f"SMS был отправлен на номер {phone}.")