param(
  [switch]$pack = $false
)

if (Test-Path ./node_modules) {
	echo "Nothing to do"
} else {
	if (Test-Path ../../node_modules) {
		echo "No need to create a symbolic link"
	} else {
		echo "npm install and creating a symbolic link"
		npm install
		mv ./node_modules ../../node_modules
	}
}
if (Get-Command gulp -errorAction SilentlyContinue) {
	if ($pack) {
	    echo "Gulp pack"
      gulp pack
    } else {
      gulp default
    }
} else {
	echo "Install gulp globally"
	npm install gulp -g
	if ($pack) {
	    echo "Gulp pack"
      gulp pack
    } else {
      gulp default
    }
}
