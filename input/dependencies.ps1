if (Test-Path ./node_modules) {
	echo "Nothing to do"
} else {
	if (Test-Path ../node_modules) {
		echo "Creating a symbolic link"
		New-Item -itemtype symboliclink -path . -name node_modules -value ../node_modules
	} else {
		echo "npm install and creating a symbolic link"
		npm install
		mv ./node_modules ../node_modules
		New-Item -itemtype symboliclink -path . -name node_modules -value ../node_modules		
	}
}
if (Get-Command gulp -errorAction SilentlyContinue) {
	gulp default
} else {
	echo "Install gulp globally"
	npm install gulp -g
	gulp default
}
