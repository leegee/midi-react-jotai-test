/** https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API  */


import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { midiAccessAtom, midiOutputsAtom, selectedOutputAtom } from '../lib/midi';


const NOTE_ON = 9;
const NOTE_OFF = 8;

const notesOn = new Map();

function onMidiMessage(event) {
    console.log( event.data );
    const cmd = event.data[0] >> 4;
    const pitch = event.data[1];
    const velocity = ( event.data.length > 2 ) ? event.data[ 2 ] : 1;
    const timestamp = Date.now();

    if ( cmd === NOTE_ON ) {
        console.log(`ON pitch:${pitch}, velocity: {velocity}`);
        notesOn.set(pitch, timestamp);
    }
    else if ( cmd === NOTE_OFF || ( cmd === NOTE_ON && velocity === 0 ) ) {
        console.log(`OFF pitch:${pitch}, velocity: ${velocity}`);
        const note = notesOn.get(pitch);
        if (note) {
          console.log(`OFF pitch:${pitch}, duration:${timestamp - note} ms.`);
          notesOn.delete(pitch);
        }
    }
}


function watchMidi ( getMidiAccess ) {
    if ( getMidiAccess ) {
        getMidiAccess.inputs.forEach( ( inputPort ) => {
            inputPort.onmidimessage = onMidiMessage;
        } );
    }
}

async function setupMidiAccess ( getMidiAccess, setMIDIAccess ) {
    if ( !getMidiAccess ) {
        try {
            const midiAccess = await navigator.requestMIDIAccess();
            setMIDIAccess( midiAccess );
        } catch ( e ) {
            console.error( 'Failed to access MIDI devices:', e );
        }
    }
}

function setupMidiOutputs ( outputs, getMidiOutputs, setMidiOutputs ) {
    const newOutputs = [];
    for (const output of outputs) {
        newOutputs.push( output );
    }
    setMidiOutputs( newOutputs );
}

// Closes open connections
function cleanup (getMidiAccess) {
    if ( getMidiAccess ) {
        getMidiAccess.inputs.forEach( ( input ) => {
            input.close();
        } );
        getMidiAccess.outputs.forEach( ( output ) => {
            output.close();
        } );
    }
}

function handleOutputChange ( event, setSelectedOutputAtom ) {
    setSelectedOutputAtom( event.target.value );
}

export function MIDIComponent () {
    const [ getMidiAccess, setMidiAccess ] = useAtom( midiAccessAtom );
    const [ getMidiOutputs, setMidiOutputs ] = useAtom( midiOutputsAtom );
    const [ getSelectedOutputAtom, setSelectedOutputAtom ] = useAtom( selectedOutputAtom );

    useEffect(
        () => {
            setupMidiAccess( getMidiAccess, setMidiAccess );
            if ( getMidiAccess ) {
                setupMidiOutputs(
                    Array.from( getMidiAccess.outputs.values() ),
                    getMidiOutputs, setMidiOutputs
                );
                watchMidi( getMidiAccess );
            }
            return cleanup( getMidiAccess );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [ getMidiAccess ]
    );

    return (
        <div>
            <h1>MIDI Access Status</h1>
            <p>{ getMidiAccess ? 'MIDI Access Granted' : 'MIDI Access Denied' }</p>

            <select onChange={(e) => handleOutputChange(e, setSelectedOutputAtom)} value={getSelectedOutputAtom}>
                {getMidiOutputs.map(output => (
                    <option key={output.id} value={output.id}>{output.name}</option>
                ))}
            </select>
        </div>
    );
}

