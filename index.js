const USB = require('usb');

const USB_DEBUG_LEVEL = 4; // 0-4

const SONY_VID = 0x054C;
const DS_EDGE_PID = 0x0DF2;

const controller = USB.findByIds(SONY_VID, DS_EDGE_PID);

if (!controller) {
    console.log("No DualSense Edge controller found... exiting.")
    process.exit(0);
}

/**
 * In order to create a new profile or overriding a profile, there needs to be 3 set config calls to create one.
 *
 * Example below creates a new profile which has a label of B x 40 (limit of name allocation) and using default configurations
 */
let bRequestSetConfigPayloads = [[                  // 12345678
    0x61, 0x00, 0x01, 0x00, 0x00, 0x00, 0x42, 0x00, // a.....B. -> first byte = profile | second byte = sequence
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x00, 0x00, 0x00, 0x00, // B.B.....
], [
    0x61, 0x01, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // a.B.B.B. -> first byte = profile | second byte = sequence | If name is longer than 27 characters, it will also fill these bytes in next sequence
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x7e, 0x05, 0x28, 0x42, // B.B.~.(B -> label ends | 5 byte in this row starts checksum?? CRC?? If anyone knows what this is, let me know.
    0x8a, 0x5d, 0x42, 0x4e, 0xa6, 0xa8, 0xcd, 0xce, // .]BN....
    0x85, 0x54, 0x22, 0x43, 0x00, 0x00, 0x00, 0x00, // .T"C....
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ........
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ........
], [
    0x61, 0x02, 0x00, 0x00, 0x00, 0xff, 0x00, 0xff, // a....... -> first byte = profile | second byte = sequence | between 5-8 triggers min+max??
    0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, // ........ -> counting up in hex?
    0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, // ........ -> continue counting?
    0x0e, 0x0f, 0x00, 0x00, 0xc0, 0x00, 0x00, 0x00, // ........ -> continue counting until 0xc0?
    0x00, 0x00, 0x1c, 0x55, 0xbb, 0x05, 0x87, 0x01, // ...U.... -> Checksum?? CRC?? | last 3 bytes 0x05, 0x87, 0x01 are static.
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ........
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ........
    0xb2, 0xba, 0x59, 0xc1, 0x00, 0x00, 0x00, 0x00, // ..Y..... -> Checksum?? CRC??
]];

const EMPTY_BUFFER_64 = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];

const REPORT_ID_DELETE_SET_CONFIG = 0x68;
const PROFILE_OPTION = [0x60, 0x61, 0x62];

const B_REQUEST_SET_CONFIG = 9;

const deleteProfile = () => {
    console.log("Profile number: ");
    console.log("0 : FN + circle");
    console.log("1 : FN + cross");
    console.log("2 : FN + square");

    readline.question(`Profile number: `, profileNumber => {
        if (PROFILE_OPTION[profileNumber]) {

            USB.usb.setDebugLevel(USB_DEBUG_LEVEL);

            controller.open(true);

            let payload = EMPTY_BUFFER_64;

            payload[0] = REPORT_ID_DELETE_SET_CONFIG;
            payload[1] = 4 - profileNumber;

            controller.controlTransfer(0x21, B_REQUEST_SET_CONFIG, 0x0368, 0x003, Buffer.from(payload), function (error, buffer) {
                console.log(buffer, error);
                console.log("Done!");
                controller.close();
                readline.close();
            });

        } else {
            console.log("Invalid option");
        }
    });
}

const createProfile = () => {

    console.log("Profile number: ");
    console.log("0 : FN + square");
    console.log("1 : FN + cross");
    console.log("2 : FN + circle");

    readline.question(`Profile number: `, profileNumber => {
        if (PROFILE_OPTION[profileNumber]) {

            USB.usb.setDebugLevel(4);

            controller.open(true);

            let steps = 0;

            for (let payload of bRequestSetConfigPayloads) {
                payload[0] = PROFILE_OPTION[profileNumber];
                controller.controlTransfer(0x21, B_REQUEST_SET_CONFIG, 0x0361, 0x003, Buffer.from(payload), function (error, buffer) {
                    console.log(buffer, error);
                    steps++;
                    if (steps === 3) {
                        // controller.controlTransfer(0xa1, 1, 0x0364, 0x003, 64) // PS5 does try to close it after creating but times out in NodeJS?
                        console.log("Done!");
                        controller.close();
                        readline.close();
                    }
                });
            }

        } else {
            console.log("Invalid option");
        }
    });
}

const readline = require('readline').createInterface({
    input: process.stdin, output: process.stdout,
});

console.log("Commands: \n- create\n- delete");

readline.question(`Profile command: `, command => {
    switch (command) {
        case 'create':
            createProfile();
            break;
        case 'delete':
            deleteProfile();
            break;
        default:
            console.log('Unknown command');
            readline.close();
            break;
    }
});