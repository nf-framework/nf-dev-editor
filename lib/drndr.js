const drndr = {
    listen: (context, scope, over, leave, drop, root) => {
        root = root ?? window;
        root.addEventListener('dragover', (e) => {
            if (over.call(context, e)){
                e.preventDefault();
                e.stopPropagation();
            }
        });
        root.addEventListener('drop', (e) => {
            drop.call(context, e);
            e.preventDefault();
            e.stopPropagation();
        });
        root.addEventListener('dragleave', (e) => {
            leave.call(context, e);
        });
    }
}


export default drndr;