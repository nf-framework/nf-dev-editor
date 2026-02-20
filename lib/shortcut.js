const _listen = [];
const shortcut = {
    listen: (seq,cb) => {
        seq = seq.map( s=> {
            let up = false;
            if (s.startsWith('^')) {
                up = true;
                s = s.slice(1);
            }
            s = s.split('+');
            return { keys: s, up };
        });
        let x = { seq, cb, pos: 0, c: false, pressed: new Map() };
        _listen.push(x);
        return x;
    },
    forget: (x) => {
        _listen.splice(_listen.indexOf(x),1);
    }
}

function keydown(e) {
    _listen.forEach( c => {
        if (c.seq[c.pos]?.keys.includes( e.code )) {
            c.pressed.set(e.code, null);
            if (c.pressed.size === c.seq[c.pos]?.keys.length && !c.seq[c.pos].up) {
                c.pos++;
                if (c.pos >= c.seq.length) {
                    c.cb(e);
                    c.pos = 0;
                    e.preventDefault();
                }
            }
        } else if (!c.wait) {
            c.pressed.clear();
            c.pos = 0;
        }
    });
}
function keyup(e) {
    _listen.forEach( async c => {
        if (c.seq[c.pos]?.keys.includes( e.code )) {
            if (c.pressed.size === c.seq[c.pos]?.keys.length && c.seq[c.pos].up) {
                c.pos++;
                if (c.pos >= c.seq.length) {
                    c.wait = true;
                    await c.cb(e);
                    c.wait = false;
                    c.pos = 0;
                    e.preventDefault();
                }
            }
        }
        c.pressed.delete(e.code);
    })
}

function reset() {
    _listen.forEach( c => {
        c.pressed.clear();
        c.pos = 0;
    });
}
function init () {
    addEventListener('keydown', keydown);
    addEventListener('keyup', keyup);
    addEventListener('blur', reset)
}
init();

window.shortcut = shortcut;
