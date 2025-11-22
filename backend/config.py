import os
import json
import uuid
import logging
from decimal import Decimal

FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

logger = logging.getLogger(__name__)
for h in logger.handlers:
  h.setFormatter(logging.Formatter(FORMAT))

if 'LOGLEVEL' in os.environ:
    logger.setLevel(int(os.environ['LOGLEVEL']))
else:
    logger.setLevel(logging.INFO)

class Config:
	def __init__(self):
		self.stage = 'dev'
		self.userdata = None
		self.userid = ''
		self.email = ''
		self.name = ''
		self.superadmin = False
		if 'LOGLEVEL' in os.environ:
			self.loglevel = int(os.environ['LOGLEVEL'])
		else:
			self.loglevel = logging.INFO
		self.event = {}

	def loaduser(self, user_id):
		# Carga básica de usuario desde Auth0 claims
		self.userdata = {
			'user_id': user_id,
			'superadmin': False,
			'email': 'user@tappy.cl',
			'given_name': 'Tappy',
			'family_name': 'User'
		}
		self.userid = self.userdata['user_id']
		self.email = self.userdata['email']
		self.name = self.userdata['given_name'] + ' ' + self.userdata['family_name']

		if 'superadmin' in self.userdata:
			self.superadmin = self.userdata['superadmin']

env = Config()
