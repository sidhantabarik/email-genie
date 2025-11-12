console.log("Email Writer Extension - Content Script Loaded");


// Button Creation (createAIButton)

function createAIButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexDirection = 'row';  // Change from column to row
    buttonContainer.style.alignItems = 'flex-start';
    buttonContainer.style.margin = '10px'; // Add margin for spacing

    // Tone selection dropdown styling
    const selectElement = document.createElement('select');
    selectElement.setAttribute('id', 'toneSelect');
    selectElement.style.marginBottom = '8px';
    selectElement.style.padding = '5px';
    selectElement.style.width = '150px'; // Set width to make it visible

    const tones = ['None', 'Professional', 'Casual', 'Friendly', 'angry'];
    tones.forEach(tone => {
        const option = document.createElement('option');
        option.value = tone.toLowerCase();
        option.textContent = tone;
        selectElement.appendChild(option);
    });

    // Default value is 'None'
    selectElement.value = 'none';
    buttonContainer.appendChild(selectElement);

    // Create AI Reply button styling
    const button = document.createElement('div');
    button.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3';
    button.style.marginRight = '8px';
    button.style.padding = '5px';  // Add padding to the button for better visibility
    button.style.cursor = 'pointer'; 
    button.innerHTML = 'AI Reply';
    button.setAttribute('role', 'button');
    button.setAttribute('data-tooltip', 'Generate AI Reply');

    buttonContainer.appendChild(button);

    return buttonContainer;
}





//  Extract Email Content (getEmailContent)
// Locates and retrieves email content from specific Gmail elements.
function getEmailContent() {
    const selectors = [
        '.h7',             // Gmail email title.
        '.a3s.aiL',        // Gmail message body.
        '.gmail_quote',    // Quoted text in replies.
        '[role="presentation"]' // Generic presentation content.
    ];
    let collectedContent = '';

    for (const selector of selectors) {
        const content = document.querySelector(selector);
        if (content) {
            collectedContent += content.innerText.trim() + '\n'; // Append content with a newline for separation
        }
    }

    return collectedContent.trim(); // Return all content combined, with no extra spaces
}



//Find Toolbar (findComposeToolbar)
// Searches for the Gmail compose toolbar.
function findComposeToolbar() {
    const selectors = [
        '.btC', // Gmail compose toolbar.
        '.aDh', // Alternative toolbar.
        '[role="toolbar"]', // Toolbar with role attribute.
        '.gU.Up' // Toolbar variant.
    ];
    for (const selector of selectors) {
        const toolbar = document.querySelector(selector);
        if (toolbar) {
            return toolbar; // Returns the first toolbar found.
        }
        return null; // If no toolbar, returns null.
    }
}


// Inject Button (injectButton)
// Injects the "AI Reply" button into Gmail's compose toolbar and handles its click events.
function injectButton() {
     const existingButton = document.querySelector('.ai-reply-button');
    if (existingButton) {
        console.log("Button already exists, removing it.");
        existingButton.remove();
    }

    const toolbar = findComposeToolbar();
if (!toolbar) {
    console.log("Toolbar not found");
    return;
}

console.log("Toolbar found, creating AI button");
const buttonContainer = createAIButton();
buttonContainer.classList.add('ai-reply-button');
console.log("Button container created:", buttonContainer);

const selectElement = buttonContainer.querySelector('#toneSelect');
console.log("Tone select element:", selectElement);

const button = buttonContainer.querySelector('div');
console.log("AI Reply button:", button);

button.addEventListener('click', async () => {
    try {
        button.innerHTML = 'Generating...';
        button.disabled = true;

        const emailContent = getEmailContent();
        const selectedTone = selectElement.value; // Get selected tone

        const response = await fetch('http://localhost:8081/api/email/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                emailContent: emailContent,
                tone: selectedTone, // Send selected tone to backend
            })
        });

        if (!response.ok) {
            throw new Error('API Request Failed');
        }

        const generatedReply = await response.text();
        const composeBox = document.querySelector('[role="textbox"][g_editable="true"]');

        if (composeBox) {
            composeBox.focus();
            document.execCommand('insertText', false, generatedReply);
        } else {
            console.error('Compose box was not found');
        }
    } catch (error) {
        console.error(error);
        alert('Failed to generate reply');
    } finally {
        button.innerHTML = 'AI Reply';
        button.disabled = false;
    }
});

toolbar.insertBefore(buttonContainer, toolbar.firstChild);

}




// DOM Mutation Observer
// Watches for changes in the DOM to detect when a compose window is opened and then calls injectButton
// Improved MutationObserver callback
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);
        const composeWindow = addedNodes.some(node =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches('.aDh, .btC, [role="dialog"]') || node.querySelector('.aDh, .btC, [role="dialog"]'))
        );

        if (composeWindow) {
            console.log("Compose Window Detected");
            injectButton(); // Directly call injectButton here instead of waiting.
        }
    }
});

// Call injectButton on script load if compose window is already open
if (document.querySelector('.aDh, .btC, [role="dialog"]')) {
    injectButton();
}

observer.observe(document.body, {
    childList: true,
    subtree: true
});


