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

import pylibmc
mc = pylibmc.Client(["127.0.0.1"], binary=True,
                     behaviors={"tcp_nodelay": True,
                                "ketama": True})


def memcached(fn):
    def new(*args, **kwargs):
        if str((args, kwargs)) in mc:
            return mc[str((args, kwargs))]
        result = fn(*args, **kwargs)
        mc[str((args, kwargs))] = result
        return result
    return new


@memcached
def generate_contactmap(structureid, metric, threshold,
                        min_threshold, seq_separation):
    r = requests.get(PDB_URL % structureid.upper())
    f = NamedTemporaryFile(delete=False)
    f.write(r.content)
    f.close()

    protein = Protein(f.name)
    chains = []
    pp = protein.get_polypeptide(chains)

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


@app.route('/')
def contact_map():
    return render_template("contact.html")


@app.route('/structure/<structureid>.json')
def structure(structureid):
    metric = request.args.get('metric', "CA")
    threshold = float(request.args.get('threshold', 8.0))
    min_threshold = float(request.args.get('min_threshold', 0.0))
    seq_separation = int(request.args.get('seq_separation', 0))
    return generate_contactmap(structureid, metric, threshold,
                               min_threshold, seq_separation)

if __name__ == '__main__':
    app.debug = True
    app.run(port=8000)
