# Third-party components

ConvertorXP code: GPL-3.0-or-later. Full license: LICENSE in the source tree and licenses/ConvertorXP-GPL-3.0.txt in the application resources.

Bundled ImageMagick 7.1.2-34: ImageMagick License; see engines/image/LICENSE.txt, associated documentation and https://imagemagick.org/license/. Source: https://github.com/ImageMagick/ImageMagick/tree/7.1.2-34. Its codec dependencies retain their own licenses.
Bundled qpdf 12.4.2: Apache-2.0; source and distribution notices: https://github.com/qpdf/qpdf/releases/tag/v12.4.2 and engines/qpdf/.
Bundled Noto Sans font: SIL Open Font License, resources/fonts/LICENSE.txt.
Electron includes Chromium and Node.js; see LICENSE.electron.txt and LICENSES.chromium.html beside the executable.
Runtime JavaScript/native dependency versions and included notices are under resources/licenses/.

Optional packages (not included in the base installer):
- FFmpeg Gyan essentials 9.0.2: GPL build, including GPL codecs. Upstream binaries/build details/source revision: https://github.com/GyanD/codexffmpeg/releases/tag/9.0.2 and https://www.gyan.dev/ffmpeg/builds/. FFmpeg license details: https://ffmpeg.org/legal.html. Re-distributors must supply corresponding source as required by the selected build licenses, not merely copy binaries.
- LibreOffice 26.8.1: MPL-2.0 / LGPL-3.0-or-later and component-specific notices included in its extracted installation. https://www.libreoffice.org/about-us/licenses/
- Tesseract.js/Tesseract and English/Turkish trained data: Apache-2.0. https://github.com/naptha/tesseract.js and https://github.com/naptha/tessdata
- 7-Zip 26.05: LGPL-2.1-or-later with the unRAR restriction and component notices included in the package. https://www.7-zip.org/license.txt

Download URLs, versions and SHA-256 hashes are pinned in resources/packages.json. Development verification reports and local machine files are not distributed. User-supplied logo/background artwork is separate from the application source-code license; this file does not grant additional rights to those assets.
