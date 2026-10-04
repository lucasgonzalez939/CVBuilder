(function (root, factory) {
    const api = factory(root && root.CVNormalizers, root && root.CVSchema);

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.CVPdfService = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (normalizers, schema) {
    if (!normalizers || !schema) {
        throw new Error('CVPdfService requires CVNormalizers and CVSchema to be loaded first.');
    }

    const { toStringSafe } = normalizers;
    const { emptyCvDataTemplate } = schema;

    let jsPdfLoaderPromise = null;

    const toAbsoluteUrl = (value) => {
        const link = toStringSafe(value).trim();
        if (!link) {
            return '';
        }

        if (link.startsWith('http://') || link.startsWith('https://')) {
            return link;
        }

        return `https://${link}`;
    };

    const getSafePdfFileName = (userName, locale) => {
        const safeUserName = toStringSafe(userName).trim() || 'CV_User';
        const sanitizedName = safeUserName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `${sanitizedName}_cv_${toStringSafe(locale).toLowerCase()}.pdf`;
    };

    const loadJsPdf = () => {
        if (window.jspdf && window.jspdf.jsPDF) {
            return Promise.resolve(window.jspdf.jsPDF);
        }

        if (jsPdfLoaderPromise) {
            return jsPdfLoaderPromise;
        }

        jsPdfLoaderPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                if (window.jspdf && window.jspdf.jsPDF) {
                    resolve(window.jspdf.jsPDF);
                } else {
                    reject(new Error('jsPDF loaded but jsPDF constructor is unavailable.'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load jsPDF script.'));
            document.body.appendChild(script);
        });

        return jsPdfLoaderPromise;
    };

    const exportToPdfImage = ({ element, fileName }) => {
        if (!element) {
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => {
            const options = {
                margin: 0.5,
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
            };
            window.html2pdf().set(options).from(element).save();
        };
        document.body.appendChild(script);
    };

    const buildCircularAvatarDataUrl = (imageDataUrl, options = {}) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvasSize = options.canvasSize ?? 320;
                const outerInset = options.outerInset ?? 14;
                const framePadding = options.framePadding ?? 3;
                const frameWidth = options.frameWidth ?? 6;
                const frameColor = options.frameColor ?? '#bfdbfe';
                const shadowColor = options.shadowColor ?? 'rgba(15, 23, 42, 0.22)';
                const shadowBlur = options.shadowBlur ?? 16;
                const shadowOffsetY = options.shadowOffsetY ?? 8;

                const canvas = document.createElement('canvas');
                canvas.width = canvasSize;
                canvas.height = canvasSize;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context is not available for avatar rendering.'));
                    return;
                }

                const center = canvasSize / 2;
                const outerRadius = center - outerInset;
                const frameRadius = outerRadius - framePadding;
                const imageRadius = frameRadius - frameWidth;

                const sourceSize = Math.min(img.naturalWidth, img.naturalHeight);
                const sourceX = (img.naturalWidth - sourceSize) / 2;
                const sourceY = (img.naturalHeight - sourceSize) / 2;

                ctx.clearRect(0, 0, canvasSize, canvasSize);

                ctx.save();
                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = shadowBlur;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = shadowOffsetY;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = frameColor;
                ctx.beginPath();
                ctx.arc(center, center, frameRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(center, center, imageRadius + 1, 0, Math.PI * 2);
                ctx.stroke();

                ctx.save();
                ctx.beginPath();
                ctx.arc(center, center, imageRadius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(
                    img,
                    sourceX,
                    sourceY,
                    sourceSize,
                    sourceSize,
                    center - imageRadius,
                    center - imageRadius,
                    imageRadius * 2,
                    imageRadius * 2
                );
                ctx.restore();

                resolve(canvas.toDataURL('image/png'));
            };

            img.onerror = () => reject(new Error('Failed to load profile image for PDF avatar rendering.'));
            img.src = imageDataUrl;
        });
    };

    const exportToPdfText = async ({ cvDataByLocale, locale, t, formatCategoryLabel, fileName, element, onFallbackMessage }) => {
        try {
            const JsPDF = await loadJsPdf();
            const doc = new JsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4',
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 44;
            const contentWidth = pageWidth - (margin * 2);
            let y = margin;

            const pdfTheme = {
                sectionTitleSize: 13,
                sectionTitleSpacingTop: 6,
                sectionTitleSpacingBottom: 14,
                nameSize: 22,
                roleSize: 13,
                bodySize: 10,
                bodyLineHeight: 15,
                compactSize: 9,
                compactLineHeight: 13,
                itemTitleSize: 11,
                itemTitleLineHeight: 15,
                textColor: [55, 65, 81],
                headingColor: [17, 24, 39],
                accentColor: [37, 99, 235],
                mutedColor: [107, 114, 128],
                avatarSize: 96,
                avatarCanvasSize: 420,
                avatarOuterInset: 18,
                avatarFramePadding: 2,
                avatarFrameWidth: 6,
                avatarShadowColor: 'rgba(15, 23, 42, 0.22)',
                avatarShadowBlur: 14,
                avatarShadowOffsetY: 6,
                avatarBottomSpacing: 26,
            };

            const ensurePageSpace = (requiredHeight = 18) => {
                if (y + requiredHeight > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }
            };

            const forceBreakLongLine = (line, maxWidth) => {
                if (doc.getTextWidth(line) <= maxWidth) {
                    return [line];
                }

                const chunks = [];
                let current = '';

                for (const char of line) {
                    const candidate = `${current}${char}`;
                    if (doc.getTextWidth(candidate) <= maxWidth) {
                        current = candidate;
                    } else {
                        if (current) {
                            chunks.push(current);
                            current = char;
                        } else {
                            chunks.push(char);
                            current = '';
                        }
                    }
                }

                if (current) {
                    chunks.push(current);
                }

                return chunks;
            };

            const getWrappedLines = (text, maxWidth) => {
                const value = toStringSafe(text).trim();
                if (!value) {
                    return [];
                }

                const paragraphs = value.replace(/\r/g, '').split('\n');
                const wrappedLines = [];

                paragraphs.forEach((paragraph, paragraphIndex) => {
                    const paragraphText = paragraph.trim();
                    if (!paragraphText) {
                        wrappedLines.push('');
                        return;
                    }

                    const tokens = paragraphText.split(/\s+/).filter(Boolean);
                    let currentLine = '';

                    tokens.forEach((token) => {
                        const candidate = currentLine ? `${currentLine} ${token}` : token;

                        if (doc.getTextWidth(candidate) <= maxWidth) {
                            currentLine = candidate;
                            return;
                        }

                        if (currentLine) {
                            wrappedLines.push(currentLine);
                            currentLine = '';
                        }

                        if (doc.getTextWidth(token) <= maxWidth) {
                            currentLine = token;
                            return;
                        }

                        const forcedTokenLines = forceBreakLongLine(token, maxWidth);
                        if (forcedTokenLines.length > 0) {
                            wrappedLines.push(...forcedTokenLines.slice(0, -1));
                            currentLine = forcedTokenLines[forcedTokenLines.length - 1];
                        }
                    });

                    if (currentLine) {
                        wrappedLines.push(currentLine);
                    }

                    if (paragraphIndex < paragraphs.length - 1) {
                        wrappedLines.push('');
                    }
                });

                return wrappedLines;
            };

            const estimateWrappedHeight = (text, maxWidth, fontSize, lineHeight) => {
                const value = toStringSafe(text).trim();
                if (!value) {
                    return 0;
                }
                doc.setFontSize(fontSize);
                const lines = getWrappedLines(value, maxWidth);
                return lines.length * lineHeight;
            };

            const estimateBulletListHeight = (items, lineHeight = 14) => {
                const cleanItems = items.map(item => toStringSafe(item).trim()).filter(Boolean);
                return cleanItems.reduce((total, item) => {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(pdfTheme.bodySize);
                    const lines = getWrappedLines(item, contentWidth - 14);
                    return total + (lines.length * lineHeight);
                }, 0);
            };

            const writeWrapped = (text, options = {}) => {
                const value = toStringSafe(text).trim();
                if (!value) {
                    return;
                }

                const x = options.x ?? margin;
                const maxWidth = options.maxWidth ?? contentWidth;
                const fontSize = options.fontSize ?? 10;
                const lineHeight = options.lineHeight ?? Math.round(fontSize * 1.45);
                const color = options.color ?? pdfTheme.textColor;
                const isBold = Boolean(options.bold);

                doc.setFont('helvetica', isBold ? 'bold' : 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(...color);

                const lines = getWrappedLines(value, maxWidth);
                ensurePageSpace(lines.length * lineHeight + 2);

                lines.forEach((line) => {
                    doc.text(line, x, y);
                    y += lineHeight;
                });
            };

            const writeCentered = (text, options = {}) => {
                const value = toStringSafe(text).trim();
                if (!value) {
                    return;
                }

                const fontSize = options.fontSize ?? 16;
                const lineHeight = options.lineHeight ?? Math.round(fontSize * 1.35);
                const color = options.color ?? pdfTheme.headingColor;
                const isBold = Boolean(options.bold);

                doc.setFont('helvetica', isBold ? 'bold' : 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(...color);

                ensurePageSpace(lineHeight + 2);
                doc.text(value, pageWidth / 2, y, { align: 'center' });
                y += lineHeight;
            };

            const writeLinkLine = (text, url, options = {}) => {
                const value = toStringSafe(text).trim();
                const href = toAbsoluteUrl(url);
                if (!value || !href) {
                    return;
                }

                const x = options.x ?? margin;
                const fontSize = options.fontSize ?? pdfTheme.bodySize;
                const lineHeight = options.lineHeight ?? Math.round(fontSize * 1.4);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(...pdfTheme.accentColor);

                const lines = getWrappedLines(value, contentWidth);
                ensurePageSpace((lines.length * lineHeight) + 2);

                lines.forEach((line) => {
                    doc.text(line, x, y);
                    const width = doc.getTextWidth(line);
                    doc.setDrawColor(...pdfTheme.accentColor);
                    doc.setLineWidth(0.6);
                    doc.line(x, y + 1.5, x + width, y + 1.5);
                    doc.link(x, y - fontSize, width, lineHeight + 2, { url: href });
                    y += lineHeight;
                });
            };

            const writeSectionTitle = (title) => {
                const value = toStringSafe(title).trim();
                if (!value) {
                    return;
                }

                y += pdfTheme.sectionTitleSpacingTop;
                ensurePageSpace(24);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(pdfTheme.sectionTitleSize);
                doc.setTextColor(...pdfTheme.headingColor);
                doc.text(value, margin, y);
                y += 8;
                doc.setDrawColor(226, 232, 240);
                doc.line(margin, y, pageWidth - margin, y);
                y += pdfTheme.sectionTitleSpacingBottom;
            };

            const writeSectionWithKeep = (title, estimatedFirstItemHeight = 0) => {
                const minRequired = 24 + Math.max(0, estimatedFirstItemHeight);
                ensurePageSpace(minRequired);
                writeSectionTitle(title);
            };

            const writeInlineContactRows = (chunks, options = {}) => {
                const fontSize = options.fontSize ?? pdfTheme.bodySize;
                const lineHeight = options.lineHeight ?? pdfTheme.bodyLineHeight;
                const separator = options.separator ?? ' | ';
                const align = options.align ?? 'left';

                const validChunks = chunks
                    .map(chunk => ({
                        text: toStringSafe(chunk.text).trim(),
                        url: chunk.url ? toAbsoluteUrl(chunk.url) : '',
                        color: chunk.color,
                    }))
                    .filter(chunk => Boolean(chunk.text));

                if (validChunks.length === 0) {
                    return;
                }

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(fontSize);

                const separatorWidth = doc.getTextWidth(separator);
                const maxX = margin + contentWidth;

                const buildLineSegments = () => {
                    const lines = [];
                    let currentLine = [];
                    let currentWidth = 0;

                    validChunks.forEach((chunk, index) => {
                        const chunkWidth = doc.getTextWidth(chunk.text);
                        const widthWithSeparator = currentWidth + (index > 0 ? separatorWidth : 0) + chunkWidth;

                        if (align === 'center' && widthWithSeparator > contentWidth && currentLine.length > 0) {
                            lines.push(currentLine);
                            currentLine = [];
                            currentWidth = 0;
                        }

                        currentLine.push({
                            chunk,
                            width: chunkWidth,
                            needsSeparator: index > 0,
                        });
                        currentWidth += (index > 0 ? separatorWidth : 0) + chunkWidth;
                    });

                    if (currentLine.length > 0) {
                        lines.push(currentLine);
                    }

                    return lines;
                };

                const lines = buildLineSegments();

                lines.forEach((lineChunks) => {
                    const lineWidth = lineChunks.reduce((sum, item) => sum + item.width + (item.needsSeparator ? separatorWidth : 0), 0);
                    let cursorX = margin;

                    if (align === 'center') {
                        cursorX = pageWidth / 2 - (lineWidth / 2);
                    }

                    const drawSegment = (text, color, url = '', xPos = cursorX) => {
                        const segmentText = toStringSafe(text);
                        if (!segmentText) {
                            return;
                        }

                        doc.setTextColor(...color);
                        doc.text(segmentText, xPos, y);
                        const width = doc.getTextWidth(segmentText);

                        if (url) {
                            doc.setDrawColor(...pdfTheme.accentColor);
                            doc.setLineWidth(0.5);
                            doc.line(xPos, y + 1.5, xPos + width, y + 1.5);
                            doc.link(xPos, y - fontSize, width, lineHeight + 2, { url });
                        }

                        return width;
                    };

                    ensurePageSpace(lineHeight + 2);

                    lineChunks.forEach((item, index) => {
                        const isLink = Boolean(item.chunk.url);
                        const color = isLink ? pdfTheme.accentColor : (item.chunk.color ?? [75, 85, 99]);

                        if (index > 0) {
                            const separatorX = cursorX;
                            doc.setTextColor(...[107, 114, 128]);
                            doc.text(separator, separatorX, y);
                            cursorX += separatorWidth;
                        }

                        const textWidth = drawSegment(item.chunk.text, color, item.chunk.url, cursorX);
                        cursorX += textWidth;
                    });

                    y += lineHeight;
                });
            };

            const writeBulletList = (items) => {
                const bulletLineHeight = 14;
                items
                    .map(item => toStringSafe(item).trim())
                    .filter(Boolean)
                    .forEach((item) => {
                        const bulletX = margin + 4;
                        const textX = margin + 14;
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(pdfTheme.bodySize);
                        const lines = getWrappedLines(item, contentWidth - 14);
                        ensurePageSpace((lines.length * bulletLineHeight) + 2);
                        doc.setTextColor(...pdfTheme.textColor);
                        doc.text('•', bulletX, y);
                        lines.forEach((line, idx) => {
                            doc.text(line, textX, y + (idx * bulletLineHeight));
                        });
                        y += lines.length * bulletLineHeight;
                    });
            };

            const localeData = cvDataByLocale[locale];
            const { personalInfo: profile, summary, experiences, education, skills, projects, awards, customSections } = localeData;

            const estimateExperienceHeight = (exp) => {
                const roleLine = [exp.title, exp.company].map(v => toStringSafe(v).trim()).filter(Boolean).join(' - ');
                const locationAndDates = [exp.location, `${toStringSafe(exp.startDate)} - ${toStringSafe(exp.endDate)}`.trim()]
                    .map(v => toStringSafe(v).trim())
                    .filter(Boolean)
                    .join(' | ');

                return estimateWrappedHeight(roleLine, contentWidth, pdfTheme.itemTitleSize, pdfTheme.itemTitleLineHeight)
                    + estimateWrappedHeight(locationAndDates, contentWidth, pdfTheme.compactSize, pdfTheme.compactLineHeight)
                    + estimateBulletListHeight(Array.isArray(exp.description) ? exp.description : [])
                    + 10;
            };

            const estimateEducationHeight = (edu) => {
                const degreeLine = [edu.degree, edu.university].map(v => toStringSafe(v).trim()).filter(Boolean).join(' - ');
                const metaLine = [edu.location, edu.year].map(v => toStringSafe(v).trim()).filter(Boolean).join(' | ');

                return estimateWrappedHeight(degreeLine, contentWidth, pdfTheme.itemTitleSize, pdfTheme.itemTitleLineHeight)
                    + estimateWrappedHeight(metaLine, contentWidth, pdfTheme.compactSize, pdfTheme.compactLineHeight)
                    + estimateWrappedHeight(edu.details, contentWidth, pdfTheme.bodySize, 14)
                    + 8;
            };

            const estimateProjectHeight = (proj) => {
                return estimateWrappedHeight(proj.name, contentWidth, pdfTheme.itemTitleSize, pdfTheme.itemTitleLineHeight)
                    + estimateWrappedHeight(proj.technologies, contentWidth, pdfTheme.compactSize, pdfTheme.compactLineHeight)
                    + estimateWrappedHeight(proj.description, contentWidth, pdfTheme.bodySize, 14)
                    + estimateWrappedHeight(proj.link, contentWidth, pdfTheme.bodySize, 14)
                    + 8;
            };

            const estimateAwardHeight = (award) => {
                const awardTitle = [award.name, award.year].map(v => toStringSafe(v).trim()).filter(Boolean).join(' - ');
                return estimateWrappedHeight(awardTitle, contentWidth, pdfTheme.itemTitleSize, pdfTheme.itemTitleLineHeight)
                    + estimateWrappedHeight(award.description, contentWidth, pdfTheme.bodySize, 14)
                    + 8;
            };

            const estimateCustomSectionHeight = (section) => {
                const titleHeight = estimateWrappedHeight(section.title, contentWidth, pdfTheme.sectionTitleSize, pdfTheme.itemTitleLineHeight);
                const itemsHeight = estimateBulletListHeight(Array.isArray(section.items) ? section.items : []);
                return titleHeight + itemsHeight + 16;
            };

            if (profile.profilePicture && profile.profilePicture.startsWith('data:image/')) {
                try {
                    const avatarSize = pdfTheme.avatarSize;
                    const avatarX = (pageWidth - avatarSize) / 2;
                    const circularAvatar = await buildCircularAvatarDataUrl(profile.profilePicture, {
                        canvasSize: pdfTheme.avatarCanvasSize,
                        outerInset: pdfTheme.avatarOuterInset,
                        framePadding: pdfTheme.avatarFramePadding,
                        frameWidth: pdfTheme.avatarFrameWidth,
                        frameColor: profile.profileFrameColor || emptyCvDataTemplate.personalInfo.profileFrameColor,
                        shadowColor: pdfTheme.avatarShadowColor,
                        shadowBlur: pdfTheme.avatarShadowBlur,
                        shadowOffsetY: pdfTheme.avatarShadowOffsetY,
                    });
                    ensurePageSpace(avatarSize + pdfTheme.avatarBottomSpacing + pdfTheme.nameSize);
                    doc.addImage(circularAvatar, 'PNG', avatarX, y, avatarSize, avatarSize);
                    y += avatarSize + pdfTheme.avatarBottomSpacing;
                } catch (imageError) {
                    console.warn('Skipping profile image in text PDF export:', imageError);
                }
            }

            writeCentered(profile.name, { fontSize: pdfTheme.nameSize, bold: true, color: [15, 23, 42] });
            writeCentered(profile.title, { fontSize: pdfTheme.roleSize, color: pdfTheme.textColor });
            y += 4;

            writeInlineContactRows([
                { text: profile.email },
                { text: profile.phone },
                { text: profile.linkedin, url: profile.linkedin },
                { text: profile.github, url: profile.github },
                { text: profile.website, url: profile.website },
                { text: profile.address },
            ], {
                fontSize: pdfTheme.bodySize,
                lineHeight: pdfTheme.bodyLineHeight,
                align: 'center',
            });

            if (toStringSafe(summary).trim()) {
                const summaryHeight = estimateWrappedHeight(summary, contentWidth, pdfTheme.bodySize, pdfTheme.bodyLineHeight);
                writeSectionWithKeep(t.summary, summaryHeight);
                writeWrapped(summary, { fontSize: pdfTheme.bodySize, lineHeight: pdfTheme.bodyLineHeight, color: pdfTheme.textColor });
            }

            if (experiences.length > 0) {
                writeSectionWithKeep(t.workExperience, estimateExperienceHeight(experiences[0]));
                experiences.forEach((exp) => {
                    const roleLine = [exp.title, exp.company].map(v => toStringSafe(v).trim()).filter(Boolean).join(' - ');
                    const locationAndDates = [exp.location, `${toStringSafe(exp.startDate)} - ${toStringSafe(exp.endDate)}`.trim()]
                        .map(v => toStringSafe(v).trim())
                        .filter(Boolean)
                        .join(' | ');

                    ensurePageSpace(estimateExperienceHeight(exp));
                    writeWrapped(roleLine, { bold: true, fontSize: pdfTheme.itemTitleSize, lineHeight: pdfTheme.itemTitleLineHeight, color: [31, 41, 55] });
                    writeWrapped(locationAndDates, { fontSize: pdfTheme.compactSize, lineHeight: pdfTheme.compactLineHeight, color: pdfTheme.mutedColor });
                    writeBulletList(Array.isArray(exp.description) ? exp.description : []);
                    y += 6;
                });
            }

            if (education.length > 0) {
                writeSectionWithKeep(t.education, estimateEducationHeight(education[0]));
                education.forEach((edu) => {
                    const degreeLine = [edu.degree, edu.university].map(v => toStringSafe(v).trim()).filter(Boolean).join(' - ');
                    const metaLine = [edu.location, edu.year].map(v => toStringSafe(v).trim()).filter(Boolean).join(' | ');

                    ensurePageSpace(estimateEducationHeight(edu));
                    writeWrapped(degreeLine, { bold: true, fontSize: pdfTheme.itemTitleSize, lineHeight: pdfTheme.itemTitleLineHeight, color: [31, 41, 55] });
                    writeWrapped(metaLine, { fontSize: pdfTheme.compactSize, lineHeight: pdfTheme.compactLineHeight, color: pdfTheme.mutedColor });
                    writeWrapped(edu.details, { fontSize: pdfTheme.bodySize, lineHeight: 14, color: pdfTheme.textColor });
                    y += 6;
                });
            }

            if (Object.values(skills).some(arr => Array.isArray(arr) && arr.some(Boolean))) {
                writeSectionWithKeep(t.skills, 30);
                Object.keys(skills).forEach((category) => {
                    const skillList = (Array.isArray(skills[category]) ? skills[category] : [])
                        .map(skill => toStringSafe(skill).trim())
                        .filter(Boolean);

                    if (skillList.length === 0) {
                        return;
                    }

                    const skillBlockHeight = estimateWrappedHeight(`${formatCategoryLabel(category)}:`, contentWidth, pdfTheme.bodySize, 14)
                        + estimateWrappedHeight(skillList.join(', '), contentWidth, pdfTheme.bodySize, 14)
                        + 4;
                    ensurePageSpace(skillBlockHeight);
                    writeWrapped(`${formatCategoryLabel(category)}:`, { bold: true, fontSize: pdfTheme.bodySize, lineHeight: 14, color: [31, 41, 55] });
                    writeWrapped(skillList.join(', '), { fontSize: pdfTheme.bodySize, lineHeight: 14, color: pdfTheme.textColor });
                    y += 4;
                });
            }

            if (projects.length > 0) {
                writeSectionWithKeep(t.projects, estimateProjectHeight(projects[0]));
                projects.forEach((proj) => {
                    ensurePageSpace(estimateProjectHeight(proj));
                    writeWrapped(proj.name, { bold: true, fontSize: pdfTheme.itemTitleSize, lineHeight: pdfTheme.itemTitleLineHeight, color: [31, 41, 55] });
                    writeWrapped(proj.technologies, { fontSize: pdfTheme.compactSize, lineHeight: pdfTheme.compactLineHeight, color: pdfTheme.mutedColor });
                    writeWrapped(proj.description, { fontSize: pdfTheme.bodySize, lineHeight: 14, color: pdfTheme.textColor });
                    writeLinkLine(proj.link, proj.link, { fontSize: pdfTheme.bodySize });
                    y += 6;
                });
            }

            if (awards.length > 0) {
                writeSectionWithKeep(t.awardsCertifications, estimateAwardHeight(awards[0]));
                awards.forEach((award) => {
                    const awardTitle = [award.name, award.year].map(v => toStringSafe(v).trim()).filter(Boolean).join(' - ');
                    ensurePageSpace(estimateAwardHeight(award));
                    writeWrapped(awardTitle, { bold: true, fontSize: pdfTheme.itemTitleSize, lineHeight: pdfTheme.itemTitleLineHeight, color: [31, 41, 55] });
                    writeWrapped(award.description, { fontSize: pdfTheme.bodySize, lineHeight: 14, color: pdfTheme.textColor });
                    y += 6;
                });
            }

            if (Array.isArray(customSections) && customSections.length > 0) {
                customSections.forEach((section) => {
                    const sectionTitle = toStringSafe(section.title).trim();
                    const sectionItems = (Array.isArray(section.items) ? section.items : []).map(item => toStringSafe(item).trim()).filter(Boolean);

                    if (!sectionTitle && sectionItems.length === 0) {
                        return;
                    }

                    writeSectionWithKeep(sectionTitle || t.customSections, estimateCustomSectionHeight(section));
                    if (sectionItems.length > 0) {
                        writeBulletList(sectionItems);
                    }
                    y += 6;
                });
            }

            doc.save(fileName);
            return true;
        } catch (error) {
            console.error('Text-based PDF export failed, using fallback:', error);
            if (typeof onFallbackMessage === 'function') {
                onFallbackMessage();
            }
            exportToPdfImage({ element, fileName });
            return false;
        }
    };

    return {
        toAbsoluteUrl,
        getSafePdfFileName,
        exportToPdfImage,
        exportToPdfText,
    };
}));
