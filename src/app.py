from flask import Flask
from flask import render_template
from flask import request
app = Flask(__name__)
from StringIO import StringIO
from pconpy import ContactMatrix, Protein
import requests
from tempfile import NamedTemporaryFile
import os

PDB_URL = "http://www.rcsb.org/pdb/download/downloadFile.do?fileFormat=pdb&compression=NO&structureId=%s"


@app.route('/')
def contact_map():
    return render_template("contact.html")


@app.route('/structure/<structureid>.json')
def structure(structureid):
    r = requests.get(PDB_URL % structureid.upper())
    f = NamedTemporaryFile(delete=False)
    f.write(r.content)
    f.close()

    protein = Protein(f.name)
    chains = []
    pp = protein.get_polypeptide(chains)

    metric = request.args.get('metric', "CA")
    threshold = float(request.args.get('threshold', 8.0))
    min_threshold = float(request.args.get('min_threshold', 0.0))
    seq_separation = int(request.args.get('seq_separation', 0))

    cmatrix = ContactMatrix(pp,
                            metric="CA",
                            threshold=threshold,
                            min_threshold=min_threshold,
                            seq_separation=seq_separation)

    fh = StringIO()
    cmatrix.print_contact_json(fh, sse="DSSP", hbonds=True)
    os.remove(f.name)
    fh.seek(0)
    return fh.read()


if __name__ == '__main__':
    app.debug = True
    app.run(port=8000)
