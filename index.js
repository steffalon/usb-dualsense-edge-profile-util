const USB = require('usb');
const CRC32 = require("crc-32");
const prompt = require('prompt-sync')({sigint: true});

const SONY_VID = 0x054C;
const DS_EDGE_PID = 0x0DF2;

const controller = USB.findByIds(SONY_VID, DS_EDGE_PID);

if (!controller) {
    console.log("No DualSense Edge controller found... exiting.")
    process.exit(0);
}

//
// controller.open();
//
// /**
//  * By chancing the vValue to between addresses (Replicating bRequestSetConfigPayloads layout [0,1,2]):
//  * 0x0370 - 0x0372 - Default profile
//  * 0x0373 - 0x0375 - First custom profile
//  * 0x0376 - 0x0378 - Second custom profile
//  * 0x0379 - 0x037b - Third custom profile
//  */
// controller.controlTransfer(0xa1, 1, 0x0378, 0x03, 63, function (error, buffer) {
//     console.table(buffer);
//     controller.close();
// });

/**
 * In order to create a new profile or overriding a profile, there needs to be 3 set config calls to create one.
 *
 * Example below creates a new profile which has a label of B x 40 (limit of name allocation) and using default configurations
 */
let bRequestSetConfigPayloads = [[                  // 12345678
    0x61, 0x00, 0x01, 0x00, 0x00, 0x00, 0x41, 0x00, // a.....A. -> first byte = profile | second byte = sequence
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x00, 0x00, 0x00, 0x00, // B.B..... -> last 4 bytes are not dependent on crc-32 check
], [0x61, 0x01, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // a.B.B.B. -> first byte = profile | second byte = sequence | If name is longer than 27 characters, it will also fill these bytes in next sequence
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x42, 0x00, 0x42, 0x00, // B.B.B.B.
    0x42, 0x00, 0x42, 0x00, 0x7e, 0x05, 0x28, 0x42, // B.B.~.(B -> label ends | 5 byte in this row starts checksum?? CRC?? If anyone knows what this is, let me know.
    0x8a, 0x5d, 0x42, 0x4e, 0xa6, 0xa8, 0xcd, 0xce, // .]BN....
    0x85, 0x54, 0x22, 0x43, 0x00, 0x00, 0x00, 0x00, // .T"C.... -> sixth byte = dead zone left stick? | last byte left stick curve adjustments
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ........ -> first to fifth byte -> left stick curve adjustments | seventh byte = dead zone right stick?
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ........ -> first to fourth byte -> right stick curve adjustments | last 4 bytes are not dependent on crc-32 check
], [0x61, 0x02, 0x00, 0x00, 0x00, 0xff, 0x00, 0xff, // a....... -> first byte = profile | second byte = sequence | third to fifth byte -> right stick curve adjustments | last 4 bytes trigger dead zone min+max L2 and R2
    0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, // ........ -> Starting fourth byte = button mapping. Counting order to 0x0f is default
    0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, // ........ -> Rest of button mapping
    0x0e, 0x0f, 0x00, 0x00, 0xc0, 0x00, 0x01, 0x00, // ........ -> Button mapping stops at 0x0f. | Fourth byte = touchpad? |  Seventh byte = joystick profile (More info below)
    0x01, 0x00, 0x1c, 0x55, 0xbb, 0x05, 0x87, 0x01, // ...U.... -> First byte = joystick profile (More info below) | Date time creation?
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ........
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // ........
    // 0xb2, 0xba, 0x59, 0xc1, 0x00, 0x00, 0x00, 0x00, ..Y..... -> first 4 bytes CRC-32 | last 4 bytes are not dependent on crc-32 check
]];

/**
 * Joystick profile
 * 0x00 = Default
 * 0x01 = Quick
 * 0x02 = Precise
 * 0x03 = Steady
 * 0x04 = Digital
 * 0x05 = Dynamic
 */

const EMPTY_BUFFER_64 = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
];

const REPORT_ID_DELETE_SET_CONFIG = 0x68;
const PROFILE_OPTION = [0x60, 0x61, 0x62];

const B_REQUEST_SET_CONFIG = 9;

const arrayCRC32Le = byteArray => {

    let copy = JSON.parse(JSON.stringify(byteArray));

    let unpackCopy = [];

    for (let i = 0; i < copy.length; i++) {
        copy[i].splice(0, 2);
        i !== copy.length - 1 ? copy[i] = copy[i].slice(0, -4) : false;
    }

    copy.map(elem => unpackCopy.push(...elem));

    return (CRC32.buf(unpackCopy) >>> 0).toString(16).match(/.{1,2}/g).reverse().map(hex => parseInt(hex, 16));
}

const createProfileLabel = () => {
    let bytes = new Array(80);

    let name = prompt('Profile name (Max 40 characters!): ');

    name = name.split('');

    for (let i = 0; i < bytes.length; i++) {
        if (i % 2 !== 0 || !name.length) {
            bytes[i] = 0x00;
        } else {
            bytes[i] = name.shift().charCodeAt(0);
        }
    }

    return bytes;
}

const deleteProfile = () => {
    console.log("Profile number: ");
    console.log("0 : FN + circle");
    console.log("1 : FN + cross");
    console.log("2 : FN + square");

    const profileNumber = prompt('Profile number: ');

    if (PROFILE_OPTION[profileNumber]) {

        controller.open(true);

        let payload = EMPTY_BUFFER_64;

        payload[0] = REPORT_ID_DELETE_SET_CONFIG;
        payload[1] = 4 - profileNumber;

        controller.controlTransfer(0x21, B_REQUEST_SET_CONFIG, 0x0368, 0x003, Buffer.from(payload), function (error, buffer) {
            console.log(buffer);
            console.log("Done!");
            controller.close();
            readline.close();
        });

    } else {
        console.log("Invalid option");
    }
}

const createProfile = () => {

    console.log("Profile number: ");
    console.log("0 : FN + square");
    console.log("1 : FN + cross");
    console.log("2 : FN + circle");

    const profileNumber = prompt('Profile number: ');

    if (PROFILE_OPTION[profileNumber]) {
        readline.close();
        controller.open(true);

        let steps = 0;

        let label = [createProfileLabel()];
        label.push(label[0].slice(54));
        label[0] = label[0].slice(0, 54);

        for (let i = 6; i < bRequestSetConfigPayloads[0].length - 4; i++) {
            if (label[0].length) {
                bRequestSetConfigPayloads[0][i] = label[0].shift();
                continue;
            }
            break;
        }

        for (let i = 2; i < 27; i++) {
            if (label[1].length) {
                bRequestSetConfigPayloads[1][i] = label[1].shift();
                continue;
            }
            break;
        }

        bRequestSetConfigPayloads[bRequestSetConfigPayloads.length - 1].push(...[...arrayCRC32Le(bRequestSetConfigPayloads), ...[0x00, 0x00, 0x00, 0x00]]);

        for (let payload of bRequestSetConfigPayloads) {
            payload[0] = PROFILE_OPTION[profileNumber];
            controller.controlTransfer(0x21, B_REQUEST_SET_CONFIG, 0x0361, 0x003, Buffer.from(payload), function (error, buffer) {
                steps++;
                if (steps === 3) {
                    console.log("Done!");
                    controller.close();
                    readline.close();
                }
            });
        }

    } else {
        console.log("Invalid option");
    }
}

const readline = require('readline').createInterface({
    input: process.stdin, output: process.stdout,
});

console.log("Commands: \n- create\n- delete");

switch (prompt('Profile command: ')) {
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