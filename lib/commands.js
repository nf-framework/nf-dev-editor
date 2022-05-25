class Command {
    /** @type String */
    type
    /** @type String */
    command
    constructor(obj) {
        Object.assign(this, obj || {});
    }
}

class DomCommand extends Command {
    type = 'dom'
    /** @type String */
    path
    /** @type Node*/
    domRoot
    /** @type Node*/
    tplRoot
    constructor(obj) {
        super(obj);
        Object.assign(this, obj || {});
    }
}

export class AddElementCommand extends DomCommand {
    command = 'add-element';
    /** @type String */
    position
    /** @type String */
    element
    constructor(obj) {
        super(obj);
        Object.assign(this, obj || {});
    }
}

export class MoveElementCommand extends DomCommand {
    command = 'move-element';
    /** @type String */
    position
    /** @type String */
    element
    constructor(obj) {
        super(obj);
        Object.assign(this, obj || {});
    }
}

export class DelElementCommand extends DomCommand {
    command = 'del-element';
    constructor(obj) {
        super(obj);
        Object.assign(this, obj || {});
    }
}

export class ChangePropertyCommand extends DomCommand {
    command = 'change-property';
    property
    value
    constructor(obj) {
        super(obj);
        Object.assign(this, obj || {});
    }
}