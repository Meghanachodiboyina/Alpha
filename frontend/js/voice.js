window.initializeVoiceInput = (buttonId, textareaId, sendButtonId, statusId) => {
    const button = document.getElementById(buttonId);
    const textarea = document.getElementById(textareaId);
    const sendButton = document.getElementById(sendButtonId);
    const status = document.getElementById(statusId);

    if (!button || !textarea) {
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    const updateSendButtonState = () => {
        if (!sendButton) {
            return;
        }
        sendButton.disabled = !textarea.value.trim();
    };

    const setVoiceUi = ({ listening = false, message = "Tap Mic and start speaking. Use Send to submit.", supported = true } = {}) => {
        button.classList.toggle("listening", listening);
        button.setAttribute("aria-pressed", String(listening));
        button.textContent = listening ? "Stop Mic" : "Mic";

        if (!supported) {
            button.disabled = true;
        }

        if (status) {
            status.textContent = message;
        }

        updateSendButtonState();
    };

    if (!SpeechRecognition) {
        setVoiceUi({
            listening: false,
            message: "Voice input is not supported in this browser.",
            supported: false,
        });
        if (sendButton) {
            sendButton.disabled = !textarea.value.trim();
        }
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    let shouldKeepListening = false;
    let isListening = false;
    let isStarting = false;
    let committedTranscript = textarea.value.trim();

    const appendTranscript = (baseText, newText) => {
        const cleanText = (newText || "").trim();
        if (!cleanText) {
            return baseText.trim();
        }
        return `${baseText.trim()}${baseText.trim() ? " " : ""}${cleanText}`.trim();
    };

    const startRecognition = () => {
        if (isListening || isStarting) {
            return;
        }
        isStarting = true;
        try {
            recognition.start();
        } catch {
            isStarting = false;
        }
    };

    const stopRecognition = () => {
        shouldKeepListening = false;
        if (isListening || isStarting) {
            recognition.stop();
        } else {
            setVoiceUi({
                listening: false,
                message: textarea.value.trim()
                    ? "Voice note ready. Press Send to submit."
                    : "Tap Mic and start speaking. Use Send to submit.",
            });
        }
    };

    recognition.onstart = () => {
        isListening = true;
        isStarting = false;
        committedTranscript = textarea.value.trim();
        setVoiceUi({
            listening: true,
            message: "Listening... keep speaking, then press Send to submit.",
        });
    };

    recognition.onresult = (event) => {
        let interimTranscript = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index];
            const transcript = result[0].transcript;
            if (result.isFinal) {
                committedTranscript = appendTranscript(committedTranscript, transcript);
            } else {
                interimTranscript = `${interimTranscript}${interimTranscript ? " " : ""}${transcript.trim()}`.trim();
            }
        }

        textarea.value = appendTranscript(committedTranscript, interimTranscript);
        textarea.focus();
        updateSendButtonState();
    };

    recognition.onend = () => {
        isListening = false;
        isStarting = false;

        if (shouldKeepListening) {
            window.setTimeout(startRecognition, 150);
            return;
        }

        setVoiceUi({
            listening: false,
            message: textarea.value.trim()
                ? "Voice note ready. Press Send to submit."
                : "Tap Mic and start speaking. Use Send to submit.",
        });
    };

    recognition.onerror = (event) => {
        isStarting = false;

        if (event.error === "not-allowed" || event.error === "service-not-allowed" || event.error === "audio-capture") {
            shouldKeepListening = false;
            setVoiceUi({
                listening: false,
                message: "Microphone permission is blocked or unavailable.",
            });
            return;
        }

        if (event.error === "aborted") {
            return;
        }

        setVoiceUi({
            listening: shouldKeepListening,
            message: shouldKeepListening
                ? "Listening paused for a moment. Trying again..."
                : "Voice input stopped. Tap Mic to try again.",
        });
    };

    textarea.addEventListener("input", updateSendButtonState);

    button.addEventListener("click", () => {
        if (shouldKeepListening || isListening || isStarting) {
            stopRecognition();
            return;
        }

        shouldKeepListening = true;
        startRecognition();
    });

    if (sendButton) {
        sendButton.addEventListener("click", () => {
            if (!textarea.value.trim()) {
                return;
            }

            if (shouldKeepListening || isListening || isStarting) {
                stopRecognition();
            }

            const form = textarea.closest("form");
            if (form?.requestSubmit) {
                form.requestSubmit();
            } else {
                form?.submit();
            }
        });
    }

    setVoiceUi();
};
