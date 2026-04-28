(() => {
    const resolveVoiceApiBase = () => {
        const saved = localStorage.getItem("arc_api_base");
        if (saved) return saved;
        if (window.location.protocol.startsWith("http") && window.location.hostname) {
            return `${window.location.protocol}//${window.location.hostname}:8000`;
        }
        return "http://127.0.0.1:8000";
    };

    const getAuthToken = () => localStorage.getItem("arc_token") || "";

    const correctVoiceTerms = (value = "") => {
        const replacements = [
            [/\bbacon\b/gi, "backend"],
            [/\bback end\b/gi, "backend"],
            [/\bfront hand\b/gi, "frontend"],
            [/\bfront end\b/gi, "frontend"],
            [/\bdata bass\b/gi, "database"],
            [/\bdata base\b/gi, "database"],
            [/\ba p i\b/gi, "API"],
            [/\bapi\b/gi, "API"],
            [/\bfast api\b/gi, "FastAPI"],
            [/\bpython\b/gi, "Python"],
            [/\bjava script\b/gi, "JavaScript"],
            [/\bjavascript\b/gi, "JavaScript"],
            [/\breact\b/gi, "React"],
            [/\bhtml\b/gi, "HTML"],
            [/\bcss\b/gi, "CSS"],
            [/\bsql\b/gi, "SQL"],
            [/\bpost gray sql\b/gi, "PostgreSQL"],
            [/\bpostgres sql\b/gi, "PostgreSQL"],
            [/\bsuper base\b/gi, "Supabase"],
            [/\bauthentification\b/gi, "authentication"],
            [/\bauth\b/gi, "authentication"],
            [/\bdash board\b/gi, "dashboard"],
        ];
        return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
    };

    const appendTranscript = (baseText, newText) => {
        const cleanBase = (baseText || "").trim();
        const cleanNew = correctVoiceTerms(newText || "").trim();
        if (!cleanNew) return cleanBase;
        return `${cleanBase}${cleanBase ? " " : ""}${cleanNew}`.trim();
    };

    const preferredMimeType = () => {
        const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"];
        return options.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
    };

    window.createGroqVoiceInput = ({
        button,
        input,
        sendButton,
        status,
        form,
        idleText = "Tap Mic and start speaking. Use Send to submit.",
        readyText = "Voice text ready. Press Send to submit.",
    }) => {
        if (!button || !input) return null;

        let mediaRecorder = null;
        let mediaStream = null;
        let chunks = [];
        let isRecording = false;
        let hasVoiceInput = false;
        let baseTextBeforeRecording = "";
        let liveTranscript = "";
        let speechRecognition = null;

        const setSendState = () => {
            if (sendButton) {
                const hasText = Boolean(input.value.trim());
                sendButton.disabled = !hasText;
                sendButton.classList.toggle("voice-send-active", hasText);
            }
        };

        const setUi = (message = idleText, recording = false) => {
            isRecording = recording;
            button.classList.toggle("listening", recording);
            button.classList.toggle("recording", recording);
            button.setAttribute("aria-pressed", String(recording));
            button.textContent = recording ? "Stop" : "Mic";
            if (status) status.textContent = message;
            setSendState();
        };

        const stopTracks = () => {
            mediaStream?.getTracks().forEach((track) => track.stop());
            mediaStream = null;
        };

        const stopLiveRecognition = () => {
            if (!speechRecognition) return;
            try {
                speechRecognition.onend = null;
                speechRecognition.stop();
            } catch {
                // Browser speech recognition may already be stopped.
            }
        };

        const startLiveRecognition = () => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return;

            speechRecognition = new SpeechRecognition();
            speechRecognition.lang = "en-US";
            speechRecognition.interimResults = true;
            speechRecognition.continuous = true;
            speechRecognition.onresult = (event) => {
                let finalText = "";
                let interimText = "";
                for (let index = event.resultIndex; index < event.results.length; index += 1) {
                    const result = event.results[index];
                    if (result.isFinal) {
                        finalText = appendTranscript(finalText, result[0].transcript);
                    } else {
                        interimText = appendTranscript(interimText, result[0].transcript);
                    }
                }
                liveTranscript = appendTranscript(liveTranscript, finalText);
                const previewText = appendTranscript(liveTranscript, interimText);
                input.value = appendTranscript(baseTextBeforeRecording, previewText);
                input.dispatchEvent(new Event("input", { bubbles: true }));
            };
            speechRecognition.onerror = () => {};
            speechRecognition.onend = () => {
                if (isRecording) {
                    window.setTimeout(() => {
                        try {
                            speechRecognition?.start();
                        } catch {
                            // Live preview is helpful, but Whisper final text remains the source of truth.
                        }
                    }, 180);
                }
            };
            try {
                speechRecognition.start();
            } catch {
                speechRecognition = null;
            }
        };

        const transcribe = async (blob) => {
            if (!blob || !blob.size) {
                setUi("No voice was captured. Try again.");
                return;
            }

            setUi("Transcribing with Whisper...", false);
            button.disabled = true;
            const formData = new FormData();
            const extension = blob.type.includes("mp4") ? "mp4" : "webm";
            formData.append("audio", blob, `voice.${extension}`);

            try {
                const response = await fetch(`${resolveVoiceApiBase()}/transcribe-audio`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${getAuthToken()}`,
                    },
                    body: formData,
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    if (liveTranscript.trim()) {
                        input.value = appendTranscript(baseTextBeforeRecording, liveTranscript);
                        hasVoiceInput = true;
                        input.dispatchEvent(new Event("input", { bubbles: true }));
                        input.focus();
                        setUi(readyText);
                        return;
                    }
                    throw new Error(data?.detail || "Voice transcription failed.");
                }
                input.value = appendTranscript(baseTextBeforeRecording, data.text || liveTranscript);
                hasVoiceInput = true;
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.focus();
                setUi(input.value.trim() ? readyText : idleText);
            } catch (error) {
                setUi(error.message || "Voice transcription failed. Try again.");
            } finally {
                button.disabled = false;
                liveTranscript = "";
                stopTracks();
            }
        };

        const startRecording = async () => {
            if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
                setUi("Voice recording is not supported in this browser.");
                button.disabled = true;
                return;
            }

            try {
                chunks = [];
                baseTextBeforeRecording = input.value.trim();
                liveTranscript = "";
                mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mimeType = preferredMimeType();
                mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data?.size) chunks.push(event.data);
                };
                mediaRecorder.onstop = () => {
                    const type = mediaRecorder?.mimeType || mimeType || "audio/webm";
                    const blob = new Blob(chunks, { type });
                    transcribe(blob);
                };
                mediaRecorder.start();
                startLiveRecognition();
                setUi("Recording... click Stop when finished.", true);
            } catch {
                setUi("Microphone permission denied or unavailable.");
                stopTracks();
            }
        };

        const stopRecording = () => {
            stopLiveRecognition();
            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
                setUi("Preparing audio...", false);
            } else {
                stopTracks();
                setUi(input.value.trim() ? readyText : idleText);
            }
        };

        button.addEventListener("click", () => {
            if (isRecording) {
                stopRecording();
                return;
            }
            startRecording();
        });

        input.addEventListener("input", setSendState);

        if (sendButton) {
            sendButton.addEventListener("click", () => {
                if (isRecording) {
                    stopRecording();
                    return;
                }
                if (!input.value.trim()) return;
                if (form?.requestSubmit) {
                    if (hasVoiceInput) form.dataset.submittedByVoice = "true";
                    hasVoiceInput = false;
                    form.requestSubmit();
                } else {
                    if (form && hasVoiceInput) form.dataset.submittedByVoice = "true";
                    hasVoiceInput = false;
                    form?.submit();
                }
            });
        }

        setUi(idleText);
        return { startRecording, stopRecording };
    };

    window.initializeVoiceInput = (buttonId, textareaId, sendButtonId, statusId) => {
        const button = document.getElementById(buttonId);
        const input = document.getElementById(textareaId);
        const sendButton = document.getElementById(sendButtonId);
        const status = document.getElementById(statusId);
        const form = input?.closest("form");

        window.createGroqVoiceInput({
            button,
            input,
            sendButton,
            status,
            form,
            idleText: "Tap Mic and start speaking. Use Send to submit.",
            readyText: "Voice text ready. Press Send to submit.",
        });
    };
})();
