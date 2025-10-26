#!/usr/bin/sh
tsx scripts/generateIcon.ts
rm -f public/favicon.ico
svg-to-ico public/favicon.svg public/favicon.ico
rm -f public/favicon-96x96.png
convert-svg-to-png --width 96 --height 96 --filename public/favicon-96x96.png < public/favicon.svg
rm -f public/favicon-192x192.png
convert-svg-to-png --width 192 --height 192 --filename public/icon-192x192.png < public/favicon.svg
rm -f public/favicon-512x512.png
convert-svg-to-png --width 512 --height 512 --filename public/icon-512x512.png < public/favicon.svg
rm -f public/apple-touch-icon.png
convert-svg-to-png --width 180 --height 180 --filename public/apple-touch-icon.png < public/favicon.svg