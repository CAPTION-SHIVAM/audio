document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const voiceSelect = document.getElementById('voice-select');
    const rateInput = document.getElementById('rate');
    const pitchInput = document.getElementById('pitch');
    const volumeInput = document.getElementById('volume');
    const speakBtn = document.getElementById('speak-btn');
    const downloadBtn = document.getElementById('download-btn');
    const stopBtn = document.getElementById('stop-btn');
    const statusDot = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    let voices = [];
    const synth = window.speechSynthesis;
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;
    let currentUtterance = null;

    // Initialize settings with default values
    const settings = {
        rate: parseFloat(rateInput.value),
        pitch: parseFloat(pitchInput.value),
        volume: parseFloat(volumeInput.value)
    };

    // Update settings and display when controls change
    rateInput.addEventListener('input', () => {
        settings.rate = parseFloat(rateInput.value);
        rateInput.nextElementSibling.textContent = settings.rate.toFixed(1);
        
        // Update live speech
        if (synth.speaking) {
            synth.cancel(); // Cancel current speech
            const utterance = new SpeechSynthesisUtterance(textInput.value);
            applySettings(utterance);
            synth.speak(utterance);
        }
    });

    pitchInput.addEventListener('input', () => {
        settings.pitch = parseFloat(pitchInput.value);
        pitchInput.nextElementSibling.textContent = settings.pitch.toFixed(1);
        
        // Update live speech
        if (synth.speaking) {
            synth.cancel(); // Cancel current speech
            const utterance = new SpeechSynthesisUtterance(textInput.value);
            applySettings(utterance);
            synth.speak(utterance);
        }
    });

    volumeInput.addEventListener('input', () => {
        settings.volume = parseFloat(volumeInput.value);
        volumeInput.nextElementSibling.textContent = settings.volume.toFixed(1);
        
        // Update live speech
        if (synth.speaking) {
            synth.cancel(); // Cancel current speech
            const utterance = new SpeechSynthesisUtterance(textInput.value);
            applySettings(utterance);
            synth.speak(utterance);
        }
    });

    function updateStatus(recording) {
        statusDot.classList.toggle('recording', recording);
        statusText.textContent = recording ? 'Recording...' : 'Ready';
    }

    function loadVoices() {
        voices = synth.getVoices();
        voiceSelect.innerHTML = '';
        
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = voice.name;
            voiceSelect.appendChild(option);
        });
    }

    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }

    function applySettings(utterance) {
        const selectedVoice = voices.find(voice => voice.name === voiceSelect.value);
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;

        utterance.onend = async () => {
            if (isRecording) {
                await stopRecording();
                updateStatus(false);
            }
        };

        utterance.onerror = async (event) => {
            console.error('Speech synthesis error:', event);
            if (isRecording) {
                await stopRecording();
                updateStatus(false);
            }
        };

        return utterance;
    }

    speakBtn.addEventListener('click', async () => {
        if (synth.speaking) {
            synth.cancel();
            if (isRecording) {
                await stopRecording();
                updateStatus(false);
            }
            return;
        }

        if (textInput.value.trim() === '') {
            alert('Please enter some text to convert to speech.');
            return;
        }

        try {
            await startRecording();
            updateStatus(true);

            const utterance = new SpeechSynthesisUtterance(textInput.value);
            applySettings(utterance);
            synth.speak(utterance);

        } catch (error) {
            console.error('Error:', error);
            alert('Unable to record audio. Please check your browser permissions.');
            updateStatus(false);
        }
    });

    async function startRecording() {
        audioChunks = [];
        const audioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        });
        
        mediaRecorder = new MediaRecorder(audioStream, {
            mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.start(100); // Collect data every 100ms
        isRecording = true;
    }

    function stopRecording() {
        return new Promise(resolve => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                resolve();
                return;
            }

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                resolve(audioBlob);
            };

            mediaRecorder.stop();
            isRecording = false;
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        });
    }

    stopBtn.addEventListener('click', async () => {
        synth.cancel();
        if (isRecording) {
            await stopRecording();
            updateStatus(false);
        }
    });

    downloadBtn.addEventListener('click', async () => {
        if (audioChunks.length === 0) {
            alert('Please generate speech first before downloading.');
            return;
        }

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = audioUrl;
        downloadLink.download = 'generated-speech.webm';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        URL.revokeObjectURL(audioUrl);
    });

    textInput.addEventListener('input', () => {
        document.querySelector('.char-count').textContent = `${textInput.value.length} characters`;
    });
}); 