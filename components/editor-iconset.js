import { html, TemplateInstance } from "polylib";
import "@plcmp/pl-iconset";

const template = html`
    <pl-iconset iconset="pl-editor">
        <svg>
            <defs>
                <g id="form-editor">
                    <path fill-rule="evenodd"
                        d="M1 15v-2.586l7.854-7.853 2.585 2.585L3.586 15H1zm11.146-8.56L14.586 4 12 1.414l-2.44 2.44 2.586 2.585zM0 12L11.293.707 12 0l.707.707 2.586 2.586L16 4l-.707.707L4 16H0v-4z" />
                </g>
                <g id="path-copy">
                    <path fill-rule="evenodd"
                        d="M15 1H4V0h12v12h-1V1zM1 5h10v10H1V5zM0 4h12v12H0V4z" />
                </g>
                <g id="path-copy-outlined">
                    <path fill-rule="evenodd"
                        d="M15.5 1H4V0h12v12h-1V1.5H4V1.5h11.5V1zM1 5h10v10H1V5zm-1-1h12v12H0V4z" />
                </g>
                <g id="search">
                    <path fill-rule="evenodd"
                        d="M12 7A5 5 0 112 7a5 5 0 0110 0zm-1.126 4.582a6 6 0 11.707-.707l3.773 3.771-.708.708-3.772-3.772z" />
                </g>
                <g id="save">
                    <path fill-rule="evenodd"
                        d="M11 4V1.414l4 4V15H1V1h3v4h7V4zM5 0H0v16h16V5l-5-5H5zm0 4V1h5v3H5zm5 6a2 2 0 11-4 0 2 2 0 014 0zm1 0a3 3 0 11-6 0 3 3 0 016 0z" />
                </g>
                <g id="add">
                    <path fill-rule="evenodd" d="M8 7V1H7v6H1v1h6v6h1V8h6V7H8z" />
                </g>
                <g id="trashcan">
                    <path fill-rule="evenodd"
                        d="M6 1h4v2H6V1zM5 3V0h6v3h4v1h-1v12H2V4H1V3h4zm6 1H3v11h10V4h-2zM7 6v7H6V6h1zm3 7V6H9v7h1z" />
                </g>
                <g id="settings">
                    <path fill-rule="evenodd"
                        d="M10.5 1v.998c.53.221 1.024.51 1.471.856l.848-.506.86-.513.486.874L16 6l-1.585.946a6.548 6.548 0 010 2.108L16 10l-1.835 3.291-.487.874-.859-.513-.848-.506a6.494 6.494 0 01-1.471.856V16h-5v-1.998a6.496 6.496 0 01-1.471-.856l-.848.506-.86.513-.486-.874L0 10l1.585-.946a6.546 6.546 0 010-2.108L0 6l1.835-3.291.487-.874.859.513.848.506A6.494 6.494 0 015.5 1.998V0h5v1zm1.984 2.713l.822-.491 1.348 2.417-.752.449-.583.348.109.671a5.544 5.544 0 010 1.786l-.11.671.584.348.752.449-1.348 2.417-.822-.49-.585-.35-.54.417a5.5 5.5 0 01-1.244.724l-.615.256V15h-3v-1.665l-.615-.256a5.497 5.497 0 01-1.245-.724l-.539-.417-.585.35-.822.49-1.348-2.417.752-.448.583-.349-.109-.671a5.545 5.545 0 010-1.786l.11-.671-.584-.349-.752-.448 1.348-2.417.822.49.585.35.54-.417c.378-.293.796-.537 1.244-.724l.615-.256V1h3v1.665l.615.256c.448.187.866.431 1.245.724l.539.417.585-.35zM10 8a2 2 0 11-4 0 2 2 0 014 0zm1 0a3 3 0 11-6 0 3 3 0 016 0z" />
                </g>
                <g id="close-s">
                    <path fill-rule="evenodd"
                        d="M8.707 8l3.146-3.146-.707-.708L8 7.293 4.854 4.146l-.708.708L7.293 8l-3.147 3.146.708.708L8 8.707l3.146 3.147.707-.707L8.707 8z" />
                </g>
                <g id="reload">
                    <path fill-rule="evenodd"
                        d="M7.312.11l2.5 2 .488.39-.488.39-2.5 2-.624-.78L8.075 3H8a5 5 0 00-3.636 8.432l-.728.686A6 6 0 018 2h.075L6.688.89l.624-.78zM13 8a4.981 4.981 0 00-1.364-3.432l.728-.686A6 6 0 018 14h-.075l1.387 1.11-.624.78-2.5-2-.488-.39.488-.39 2.5-2 .624.78L7.925 13H8a5 5 0 005-5z" />
                </g>
                <g id="align-start">
                    <rect x="2" y="2" width="1" height="12" rx=".5" />
                    <rect x="4" y="2.5" width="8.5" height="1.2" rx=".6" />
                    <rect x="4" y="5.5" width="10.5" height="1.2" rx=".6" />
                    <rect x="4" y="8.5" width="7.5" height="1.2" rx=".6" />
                    <rect x="4" y="11.5" width="9.5" height="1.2" rx=".6" />
                </g>
                <g id="align-center">
                    <rect x="7.5" y="2" width="1" height="12" rx=".5" />
                    <rect x="3.75" y="2.5" width="8.5" height="1.2" rx=".6" />
                    <rect x="2.75" y="5.5" width="10.5" height="1.2" rx=".6" />
                    <rect x="4.25" y="8.5" width="7.5" height="1.2" rx=".6" />
                    <rect x="3.25" y="11.5" width="9.5" height="1.2" rx=".6" />
                </g>
                <g id="align-end">
                    <rect x="13" y="2" width="1" height="12" rx=".5" />
                    <rect x="4.5" y="2.5" width="8.5" height="1.2" rx=".6" />
                    <rect x="2.5" y="5.5" width="10.5" height="1.2" rx=".6" />
                    <rect x="5.5" y="8.5" width="7.5" height="1.2" rx=".6" />
                    <rect x="3.5" y="11.5" width="9.5" height="1.2" rx=".6" />
                </g>
                <g id="align-baseline">
                    <rect x="2" y="12" width="12" height="1" rx=".5" />
                    <rect x="3" y="6" width="2.2" height="6" rx=".5" />
                    <rect x="6.5" y="8" width="2.2" height="4" rx=".5" />
                    <rect x="10" y="4" width="2.2" height="8" rx=".5" />
                </g>
                <g id="justify-start">
                    <rect x="2" y="2.5" width="10" height="1.2" rx=".6" />
                    <rect x="2" y="5.5" width="8" height="1.2" rx=".6" />
                    <rect x="2" y="8.5" width="11" height="1.2" rx=".6" />
                    <rect x="2" y="11.5" width="9" height="1.2" rx=".6" />
                </g>
                <g id="justify-center">
                    <rect x="3" y="2.5" width="10" height="1.2" rx=".6" />
                    <rect x="4" y="5.5" width="8" height="1.2" rx=".6" />
                    <rect x="2.5" y="8.5" width="11" height="1.2" rx=".6" />
                    <rect x="3.5" y="11.5" width="9" height="1.2" rx=".6" />
                </g>
                <g id="justify-end">
                    <rect x="4" y="2.5" width="10" height="1.2" rx=".6" />
                    <rect x="6" y="5.5" width="8" height="1.2" rx=".6" />
                    <rect x="3" y="8.5" width="11" height="1.2" rx=".6" />
                    <rect x="5" y="11.5" width="9" height="1.2" rx=".6" />
                </g>
                <g id="justify-space-between">
                    <rect x="2" y="2.5" width="12" height="1.2" rx=".6" />
                    <rect x="2" y="5.5" width="12" height="1.2" rx=".6" />
                    <rect x="2" y="8.5" width="12" height="1.2" rx=".6" />
                    <rect x="2" y="11.5" width="12" height="1.2" rx=".6" />
                </g>
            </defs>
        </svg>
    </pl-iconset>
`;

let instance = new TemplateInstance(template);
instance.attach(document.head);
