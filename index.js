var blessed = require("blessed");
var childProcess = require('child_process');
var fs = require("fs");

let speechBuffer = [];
let speechHistory = [];
let currentHistory = -1;
let speaking = false;
const banner = fs.readFileSync('banner.txt', 'utf8');

var screen = blessed.screen(
{
	smartCSR: true
});

screen.title = "tts.js";

var output = blessed.box(
{
	top:"0",
	left:"0",
	width:"100%",
	height:"90%",
	scrollable:"true",
	alwaysScroll:"true",
	content:banner,
	border: {
		type:"line"
	},
	style: {
		fg:"white",
		bg:"black",
		border: {
			fg:"white"
		}
	}
});

var input = blessed.textbox(
{
	bottom:"0",
	left:"0",
	width:"100%",
	height:"10%",
	inputOnFocus:"true",
	border:{
		type:"line"
	},
	style: {
		fg:"white",
		bg:"black",
		border: {
			fg:"white"
		}
	}
});

input.on("submit", function(data)
{
	currentHistory = -1;

	input.clearValue();
	input.focus();

	switch (data.split(" ")[0])
	{
		case "":
			break;
		case "/clear":
		case "/cls":
			output.setContent("");
			break;
		case "/exit":
		case "/quit":
		case "/stop":
		case "/close":
		case "/kill":
			return process.exit(0);
			break;
		default:
			if (data.charAt(0) == "/")
			{
				output.pushLine(`Error: Invalid command ${data.split(" ")[0]}`);
				output.setScrollPerc(100);
				break;
			}

			speechBuffer.push(data);
			speechHistory.unshift(data);
			updateSpeech();

			output.pushLine("Input: " + data);
			output.setScrollPerc(100);
	}

	screen.render();
});

input.on("cancel", function(data)
{
	currentHistory = -1;

	input.clearValue();
	input.focus();

	screen.render();
});

input.enableKeys();
input.on('keypress', function(ch, key)
{
	switch (key.name)
	{
		case "up":
			currentHistory++;
			updateHistory();
			break;
		case "down":
			currentHistory--;
			updateHistory();
			break;
	}
});

function updateSpeech()
{
	if (speechBuffer.length > 0 && !speaking)
	{
		speaking = true;

		let psCommand = `Add-Type -AssemblyName System.speech;$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;$speak.SelectVoice("Microsoft Hazel Desktop");`
		let args = [];

		psCommand += `$speak.Speak("${speechBuffer[0]}")`;

		args.push(psCommand);

		var child = childProcess.spawn("powershell", args);

		child.addListener("exit", (code, signal) => {
			speechBuffer.shift();
			speaking = false;

			if (speechBuffer.length > 0)
			{
				updateSpeech();
			}
		});

		child.on("exit", function(code, signal)
		{
			speechBuffer.shift();
			speaking = false;

			if (speechBuffer.length > 0)
			{
				updateSpeech();
			}
		});
	}
}

function updateHistory()
{
	currentHistory = currentHistory.clamp(-1, speechHistory.length-1);

	if (currentHistory < 0)
	{
		input.clearValue();
	}
	else
	{
		input.setValue(speechHistory[currentHistory]);
	}

	screen.render();
}

screen.append(output);
screen.append(input);

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

input.focus();
screen.render();



Number.prototype.clamp = function(min, max)
{
	return Math.min(Math.max(this, min), max);
};