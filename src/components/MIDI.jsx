/** https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API  */

// eslint-disable-next-line no-unused-vars
import React, { useEffect } from 'react';
import { useAtom } from 'jotai';
import { Note } from "tonal";

import { midiAccessAtom, midiOutputsAtom, selectedOutputAtom, notesOnAtom, scaleNotesAtom } from '../lib/midi';
import OutputSelect from './OutputSelect';
import NotesOnDisplay from './NotesOnDisplay';
import ScaleSelector from './ScaleSelector';
import PianoKeyboard from './Piano';

const NOTE_ON = 9;
const NOTE_OFF = 8;

let watchMidiInitialized = false;

function getTriadNoteNames(midiPitch, scaleNotes) {
    const [rootNote, octaveNumber] = Note.fromMidi( midiPitch ).split('');
    const rootIndex = scaleNotes.indexOf(rootNote);
    if (rootIndex === -1) {
        throw new Error(`The MIDI pitch ${rootNote} does not correspond to any note in the scale: ${scaleNotes.join(' ')}`);
    }

    const thirdIndex = (rootIndex + 2) % scaleNotes.length; 
    const fifthIndex = (rootIndex + 4) % scaleNotes.length; 

    const triad = [
        Note.get( rootNote + octaveNumber).midi,
        Note.get( scaleNotes[thirdIndex] + octaveNumber).midi,
        Note.get( scaleNotes[fifthIndex] + octaveNumber).midi,
    ];

    return triad;
}

function playNotes ( {notes, velocity, midiOutputs, selectedOutput} ) {
    for ( const note of notes ) {
        console.log( 'note', note, '..', notes );
    }
    console.info('>>', midiOutputs, selectedOutput, )
    // midiOutputs[selectedOutput].send([MIDI_CHANNEL, 60, velocity]); // Note On message (channel 1, note 60, velocity 100)
}

function onMidiMessage ( event, setNotesOn, scaleNotes, midiOutputs, selectedOutput ) {
    const cmd = event.data[0] >> 4;
    const pitch = event.data[1];
    const velocity = ( event.data.length > 2 ) ? event.data[ 2 ] : 1;
    const timestamp = Date.now();

    setNotesOn((prevNotesOn) => {
        const newNotesOn = { ...prevNotesOn }; 

        if (cmd === NOTE_ON && velocity > 0 && !newNotesOn[pitch]) {
            console.log(`NOTE ON pitch:${pitch}, velocity: ${velocity}`);
            newNotesOn[ pitch ] = { timestamp, velocity };
            const triad = getTriadNoteNames( pitch, scaleNotes );
            playNotes( {notes: triad, velocity, midiOutputs, selectedOutput} );
        }
        else if ( cmd === NOTE_OFF || velocity === 0) {
            if (newNotesOn[pitch]) {
                console.log(`NOTE OFF pitch:${pitch}: duration:${timestamp - newNotesOn[pitch].timestamp} ms.`);
                delete newNotesOn[pitch];
            }
        }

        return newNotesOn; 
    });
}

export function MIDIComponent () {
    const [ midiAccess, setMidiAccess ] = useAtom( midiAccessAtom );
    const [ midiOutputs, setMidiOutputs ] = useAtom( midiOutputsAtom );
    const [ selectedOutput, setSelectedOutput ] = useAtom( selectedOutputAtom );
    const [ notesOn, setNotesOn ] = useAtom( notesOnAtom );
    const [ scaleNotes, ] = useAtom( scaleNotesAtom );
    
    useEffect(() => {
        if (!midiAccess) {
            try {
                navigator.requestMIDIAccess().then(midiAccess => setMidiAccess(midiAccess));
            } catch (error) {
                console.error( 'Failed to access MIDI devices:', error );
                return ( <div>Failed to access MIDI devices: ${error}</div> );
            }
        }
        else {
            const newOutputs = Array.from(midiAccess.outputs.values());
            setMidiOutputs(newOutputs);
            if ( !watchMidiInitialized ) {
                console.log( "Init midi listeners" );
                midiAccess.inputs.forEach(inputPort => {
                    inputPort.onmidimessage = e => onMidiMessage(e, setNotesOn, scaleNotes);
                });
                watchMidiInitialized = true;
            }
        }
    }, [ midiAccess, setMidiAccess, setMidiOutputs, setNotesOn, scaleNotes ]);

    return (
        <div>
            <h1>MIDI Test</h1>

            <OutputSelect
                midiOutputs={midiOutputs}
                selectedOutput={Number(selectedOutput)}
                setSelectedOutput={setSelectedOutput}
            />

            <ScaleSelector />

            <PianoKeyboard notesOn={ notesOn } />

            <NotesOnDisplay notesOn={ notesOn } />

        </div>
    );
}

