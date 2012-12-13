activate_this = '/opt/contact-map/bin/activate_this.py'
execfile(activate_this, dict(__file__=activate_this))

from pconpy.app import app as application