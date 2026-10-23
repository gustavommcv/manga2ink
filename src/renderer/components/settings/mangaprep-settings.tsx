import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useState,
} from 'react';

import type { BookFormat } from '@/domain/conversion';
import type { AnyMessage } from '@/domain/message';
import {
  type AutoContrastMode,
  autoContrastOf,
  type BorderMode,
  borderModeOf,
  coverAndNameLocks,
  defaultJpegQualityFor,
  defaultPageSizeFor,
  defaultValueForSetting,
  imageLocks,
  jpegUseOf,
  type MangaprepSettingField,
  type MangaprepSettings,
  pageLayoutLocks,
  type PageSizeMode,
  pageSizeOf,
  restoreSettingDefault,
  validateMangaprepSettings,
  withAutoContrast,
  withBorderMode,
  withDeviceProfile,
  withPageSize,
} from '@/domain/output-profile';
import { withQueueValue } from '@/domain/item-options';
import { defaultFormat } from '@/domain/preferences';
import { SettingFieldHeader } from '@/renderer/components/shared/setting-field-header';
import { CheckRow } from '@/renderer/components/shared/check-row';
import { Eyebrow } from '@/renderer/components/shared/eyebrow';
import { Field } from '@/renderer/components/shared/field';
import { InfoBanner } from '@/renderer/components/shared/info-banner';
import { useMessages, useSay } from '@/renderer/hooks/use-messages';
import { Input } from '@/renderer/components/ui/input';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import type { DeviceProfileSummary } from '@/shared/workflow-contract';
import { Note } from '@/renderer/components/shared/note';

interface MangaprepSettingsProps {
  readonly format: BookFormat;
  readonly onFormat: (format: BookFormat) => void;
  /** A short message shown to the person, the same mechanism used for saved-setting fallbacks. */
  readonly onNotify?: (message: string) => void;
  readonly onSettings: (settings: MangaprepSettings) => void;
  readonly profiles: readonly DeviceProfileSummary[];
  /**
   * The options of the queue, when these are the options of one item (ADR 0046): a field is then
   * changed when it differs from them, not from the app's defaults, and its reset puts theirs back.
   */
  readonly queue?: { readonly settings: MangaprepSettings; readonly format: BookFormat };
  readonly settings: MangaprepSettings;
  readonly singleBook?: boolean;
}

export function MangaprepSettingsEditor({
  format,
  onFormat,
  onSettings,
  profiles,
  queue,
  settings,
  singleBook,
}: MangaprepSettingsProps): React.JSX.Element {
  const { say } = useSay();
  const words = useMessages().fields;
  /** Why a control has no effect, or what is wrong with a value, said in the language of the window. */
  const said = (reason: AnyMessage | undefined): string | undefined =>
    reason === undefined ? undefined : say(reason);
  const singleBookActive = Boolean(singleBook);
  const issues = validateMangaprepSettings(settings);
  const errorFor = (field: MangaprepSettingField): string | undefined =>
    said(issues.find((issue) => issue.field === field)?.message);
  const selectedProfile = profiles.find((candidate) => candidate.code === settings.deviceProfile);
  const jpegQualityDefault = defaultJpegQualityFor(settings.deviceProfile);
  const update = <K extends keyof MangaprepSettings>(
    field: K,
    value: MangaprepSettings[K],
  ): void => {
    onSettings({ ...settings, [field]: value });
  };
  // What a field is compared with, and put back to: the app's defaults, or the queue's options.
  const resetsTo = queue === undefined ? undefined : ('queue' as const);
  const resetProps = (
    field: keyof MangaprepSettings,
  ): {
    readonly changed: boolean;
    readonly onReset: () => void;
    readonly resetsTo?: 'queue';
  } =>
    queue === undefined
      ? {
          changed: settings[field] !== defaultValueForSetting(settings, field),
          onReset: () => {
            onSettings(restoreSettingDefault(settings, field));
          },
        }
      : {
          changed: settings[field] !== queue.settings[field],
          onReset: () => {
            onSettings(withQueueValue(settings, queue.settings, field));
          },
          resetsTo: 'queue',
        };
  const locks = pageLayoutLocks(settings, format);
  const imageLock = imageLocks(settings, format);
  const bookLock = coverAndNameLocks(settings, format, selectedProfile?.family);
  const pageSize = pageSizeOf(settings);
  const borders = borderModeOf(settings);
  const formatBaseline = queue === undefined ? defaultFormat : queue.format;
  const pageSizeBaseline =
    queue === undefined ? defaultPageSizeFor(settings.deviceProfile) : pageSizeOf(queue.settings);
  const bordersBaseline: BorderMode =
    queue === undefined ? 'automatic' : borderModeOf(queue.settings);
  const autoContrast = autoContrastOf(settings);
  const autoContrastBaseline: AutoContrastMode =
    queue === undefined ? 'monochrome' : autoContrastOf(queue.settings);
  const jpegUse = jpegUseOf(settings, format);
  // The three numbers tune margin cropping, so they follow it: off by choice, or off for webtoons.
  const croppingReason =
    said(locks.marginCropping) ??
    (settings.cropping === 'disabled' ? words.cropping.enableFirst : undefined);
  const croppingDisabled = croppingReason !== undefined;
  const autolevelReason =
    said(locks.autoContrast) ??
    (autoContrast === 'off' ? words.color.autoContrast.turnOnFirst : undefined);
  const colorDescription = settings.noProcessing
    ? words.color.pages.helpUntouched
    : settings.forceColor
      ? words.color.pages.helpColor
      : words.color.pages.helpGray;
  const pageFormatDescription = !settings.forcePng
    ? words.images.format.helpJpeg
    : settings.noQuantize
      ? words.images.format.helpAllGrays
      : words.images.format.helpDithered;
  const jpegQualityHint = words.images.jpegQuality.hint(jpegQualityDefault);

  return (
    <div className="space-y-5">
      {singleBookActive && (
        <InfoBanner message={words.singleBook.text} title={words.singleBook.title} />
      )}
      <SettingsSection
        description={words.device.description}
        eyebrow={words.eyebrow.basic}
        title={words.device.title}
      >
        <SelectField
          {...resetProps('deviceProfile')}
          description={
            selectedProfile === undefined
              ? undefined
              : words.device.profile.detail(
                  selectedProfile.width,
                  selectedProfile.height,
                  selectedProfile.grayLevels,
                )
          }
          error={errorFor('deviceProfile')}
          id="device-profile"
          label={words.device.profile.label}
        >
          <NativeSelect
            aria-describedby="device-profile-message"
            aria-invalid={errorFor('deviceProfile') === undefined ? undefined : true}
            disabled={profiles.length === 0}
            id="device-profile"
            onChange={(event) => {
              onSettings(withDeviceProfile(settings, event.target.value));
            }}
            value={settings.deviceProfile}
          >
            {profiles.length === 0 && <option value="">{words.device.profile.unavailable}</option>}
            {profiles.map((candidate) => (
              <option key={candidate.code} value={candidate.code}>
                {candidate.name} ({candidate.code})
              </option>
            ))}
          </NativeSelect>
        </SelectField>
        <SelectField
          changed={format !== formatBaseline}
          id="output-format"
          label={words.device.format.label}
          onReset={() => {
            onFormat(formatBaseline);
          }}
          resetsTo={resetsTo}
        >
          <NativeSelect
            id="output-format"
            onChange={(event) => {
              onFormat(event.target.value as BookFormat);
            }}
            value={format}
          >
            <option value="cbz">CBZ</option>
            <option value="epub">EPUB</option>
            <option value="pdf">PDF</option>
          </NativeSelect>
        </SelectField>
        <NumberField
          {...resetProps('customWidth')}
          description={words.device.customWidth.description}
          error={errorFor('customWidth')}
          id="custom-width"
          label={words.device.customWidth.label}
          min={1}
          placeholder={
            selectedProfile !== undefined && selectedProfile.width > 0
              ? String(selectedProfile.width)
              : words.device.customWidth.placeholder
          }
          onValue={(value) => {
            update('customWidth', value);
          }}
          optional
          value={settings.customWidth}
        />
        <NumberField
          {...resetProps('customHeight')}
          description={words.device.customHeight.description}
          error={errorFor('customHeight')}
          id="custom-height"
          label={words.device.customHeight.label}
          min={1}
          placeholder={
            selectedProfile !== undefined && selectedProfile.height > 0
              ? String(selectedProfile.height)
              : words.device.customHeight.placeholder
          }
          onValue={(value) => {
            update('customHeight', value);
          }}
          optional
          value={settings.customHeight}
        />
        <ToggleField
          {...resetProps('noProcessing')}
          checked={settings.noProcessing}
          description={words.device.noProcessing.description}
          id="no-processing"
          label={words.device.noProcessing.label}
          onChecked={(checked) => {
            update('noProcessing', checked);
          }}
        />
        <ToggleField
          {...resetProps('noKepub')}
          checked={settings.noKepub}
          description={said(bookLock.noKepub) ?? words.device.noKepub.description}
          disabled={bookLock.noKepub !== undefined}
          id="no-kepub"
          label={words.device.noKepub.label}
          onChecked={(checked) => {
            update('noKepub', checked);
          }}
        />
      </SettingsSection>

      <SettingsSection
        description={words.reading.description}
        eyebrow={words.eyebrow.basic}
        title={words.reading.title}
      >
        <SelectField
          {...resetProps('webtoon')}
          description={
            settings.webtoon ? words.reading.content.webtoonHelp : words.reading.content.pagesHelp
          }
          id="content"
          label={words.reading.content.label}
        >
          <NativeSelect
            aria-describedby="content-message"
            id="content"
            onChange={(event) => {
              update('webtoon', event.target.value === 'webtoon');
            }}
            value={settings.webtoon ? 'webtoon' : 'pages'}
          >
            <option value="pages">{words.reading.content.pages}</option>
            <option value="webtoon">{words.reading.content.webtoon}</option>
          </NativeSelect>
        </SelectField>
        <ToggleField
          {...resetProps('mangaStyle')}
          checked={settings.mangaStyle}
          description={said(locks.mangaStyle) ?? words.reading.mangaStyle.description}
          disabled={locks.mangaStyle !== undefined}
          id="manga-style"
          label={words.reading.mangaStyle.label}
          onChecked={(checked) => {
            update('mangaStyle', checked);
          }}
        />
      </SettingsSection>

      <SettingsSection
        description={words.spreads.description}
        eyebrow={words.eyebrow.advanced}
        title={words.spreads.title}
      >
        <SelectField
          {...resetProps('splitter')}
          description={said(locks.splitter) ?? words.spreads.wide.help[settings.splitter]}
          disabled={locks.splitter !== undefined}
          id="splitter"
          label={words.spreads.wide.label}
        >
          <NativeSelect
            aria-describedby="splitter-message"
            disabled={locks.splitter !== undefined}
            id="splitter"
            onChange={(event) => {
              update('splitter', event.target.value as MangaprepSettings['splitter']);
            }}
            value={settings.splitter}
          >
            <option value="split">{words.spreads.wide.names.split}</option>
            <option value="rotate">{words.spreads.wide.names.rotate}</option>
            <option value="both">{words.spreads.wide.names.both}</option>
          </NativeSelect>
        </SelectField>
        <ToggleField
          {...resetProps('rotateFirst')}
          checked={settings.rotateFirst}
          description={said(locks.rotateFirst) ?? words.spreads.rotateFirst.description}
          disabled={locks.rotateFirst !== undefined}
          id="rotate-first"
          label={words.spreads.rotateFirst.label}
          onChecked={(checked) => {
            update('rotateFirst', checked);
          }}
        />
        <ToggleField
          {...resetProps('noRotate')}
          checked={settings.noRotate}
          description={said(locks.noRotate) ?? words.spreads.noRotate.description}
          disabled={locks.noRotate !== undefined}
          id="no-rotate"
          label={words.spreads.noRotate.label}
          onChecked={(checked) => {
            update('noRotate', checked);
          }}
        />
        <ToggleField
          {...resetProps('rotateRight')}
          checked={settings.rotateRight}
          description={said(locks.rotateRight) ?? words.spreads.rotateRight.description}
          disabled={locks.rotateRight !== undefined}
          id="rotate-right"
          label={words.spreads.rotateRight.label}
          onChecked={(checked) => {
            update('rotateRight', checked);
          }}
        />
        <ToggleField
          {...resetProps('maximizeStrips')}
          checked={settings.maximizeStrips}
          description={said(locks.maximizeStrips) ?? words.spreads.maximizeStrips.description}
          disabled={locks.maximizeStrips !== undefined}
          id="maximize-strips"
          label={words.spreads.maximizeStrips.label}
          onChecked={(checked) => {
            update('maximizeStrips', checked);
          }}
        />
      </SettingsSection>

      <SettingsSection
        description={words.size.description}
        eyebrow={words.eyebrow.advanced}
        title={words.size.title}
      >
        <SelectField
          changed={pageSize !== pageSizeBaseline}
          description={
            said(locks.pageSize) ??
            (settings.webtoon && pageSize === 'enlarge'
              ? words.size.pageSize.webtoonEnlarge
              : words.size.pageSize.help[pageSize])
          }
          disabled={locks.pageSize !== undefined}
          id="page-size"
          label={words.size.pageSize.label}
          onReset={() => {
            onSettings(withPageSize(settings, pageSizeBaseline));
          }}
          resetsTo={resetsTo}
        >
          <NativeSelect
            aria-describedby="page-size-message"
            disabled={locks.pageSize !== undefined}
            id="page-size"
            onChange={(event) => {
              onSettings(withPageSize(settings, event.target.value as PageSizeMode));
            }}
            value={pageSize}
          >
            <option value="fit">{words.size.pageSize.names.fit}</option>
            <option value="enlarge">{words.size.pageSize.names.enlarge}</option>
            <option value="stretch">{words.size.pageSize.names.stretch}</option>
            <option value="fill">{words.size.pageSize.names.fill}</option>
          </NativeSelect>
        </SelectField>
        <SelectField
          changed={borders !== bordersBaseline}
          description={
            said(locks.borders) ??
            words.size.borders[format === 'epub' ? 'epub' : 'padded'][borders]
          }
          disabled={locks.borders !== undefined}
          id="borders"
          label={words.size.borders.label}
          onReset={() => {
            onSettings(withBorderMode(settings, bordersBaseline));
          }}
          resetsTo={resetsTo}
        >
          <NativeSelect
            aria-describedby="borders-message"
            disabled={locks.borders !== undefined}
            id="borders"
            onChange={(event) => {
              onSettings(withBorderMode(settings, event.target.value as BorderMode));
            }}
            value={borders}
          >
            <option value="automatic">{words.size.borders.names.automatic}</option>
            <option value="white">{words.size.borders.names.white}</option>
            <option value="black">{words.size.borders.names.black}</option>
          </NativeSelect>
        </SelectField>
      </SettingsSection>

      <SettingsSection
        description={words.cropping.description}
        eyebrow={words.eyebrow.advanced}
        title={words.cropping.title}
      >
        <SelectField
          {...resetProps('cropping')}
          description={said(locks.marginCropping)}
          disabled={locks.marginCropping !== undefined}
          id="cropping"
          label={words.cropping.pages.label}
        >
          <NativeSelect
            aria-describedby="cropping-message"
            disabled={locks.marginCropping !== undefined}
            id="cropping"
            onChange={(event) => {
              update('cropping', event.target.value as MangaprepSettings['cropping']);
            }}
            value={settings.cropping}
          >
            <option value="disabled">{words.cropping.pages.names.disabled}</option>
            <option value="margins">{words.cropping.pages.names.margins}</option>
            <option value="margins-and-page-numbers">
              {words.cropping.pages.names['margins-and-page-numbers']}
            </option>
          </NativeSelect>
        </SelectField>
        <NumberField
          {...resetProps('croppingPower')}
          description={croppingReason ?? words.cropping.power.description}
          disabled={croppingDisabled}
          error={errorFor('croppingPower')}
          id="cropping-power"
          label={words.cropping.power.label}
          onValue={(value) => {
            if (value !== undefined) update('croppingPower', value);
          }}
          step={0.1}
          value={settings.croppingPower}
        />
        <NumberField
          {...resetProps('croppingMinimum')}
          description={croppingReason ?? words.cropping.minimum.description}
          disabled={croppingDisabled}
          error={errorFor('croppingMinimum')}
          id="cropping-minimum"
          label={words.cropping.minimum.label}
          max={100}
          min={0}
          onValue={(value) => {
            if (value !== undefined) update('croppingMinimum', value);
          }}
          step={0.1}
          value={settings.croppingMinimum}
        />
        <NumberField
          {...resetProps('preserveMargin')}
          description={croppingReason ?? words.cropping.preserve.description}
          disabled={croppingDisabled}
          error={errorFor('preserveMargin')}
          id="preserve-margin"
          label={words.cropping.preserve.label}
          max={100}
          min={0}
          onValue={(value) => {
            if (value !== undefined) update('preserveMargin', value);
          }}
          step={0.1}
          value={settings.preserveMargin}
        />
        <SelectField
          {...resetProps('interPanelCrop')}
          description={said(locks.interPanelCropping) ?? words.cropping.interPanel.description}
          disabled={locks.interPanelCropping !== undefined}
          id="inter-panel-crop"
          label={words.cropping.interPanel.label}
        >
          <NativeSelect
            aria-describedby="inter-panel-crop-message"
            disabled={locks.interPanelCropping !== undefined}
            id="inter-panel-crop"
            onChange={(event) => {
              update('interPanelCrop', event.target.value as MangaprepSettings['interPanelCrop']);
            }}
            value={settings.interPanelCrop}
          >
            <option value="disabled">{words.cropping.interPanel.names.disabled}</option>
            <option value="horizontal">{words.cropping.interPanel.names.horizontal}</option>
            <option value="both">{words.cropping.interPanel.names.both}</option>
          </NativeSelect>
        </SelectField>
      </SettingsSection>

      <SettingsSection
        description={words.twoPage.description}
        eyebrow={words.eyebrow.advanced}
        title={words.twoPage.title}
      >
        <ToggleField
          {...resetProps('spreadShift')}
          checked={settings.spreadShift}
          description={said(locks.twoPageView) ?? words.twoPage.spreadShift.description}
          disabled={locks.twoPageView !== undefined}
          id="spread-shift"
          label={words.twoPage.spreadShift.label}
          onChecked={(checked) => {
            update('spreadShift', checked);
          }}
        />
        <ToggleField
          {...resetProps('onePageLandscape')}
          checked={settings.onePageLandscape}
          description={said(locks.twoPageView) ?? words.twoPage.onePage.description}
          disabled={locks.twoPageView !== undefined}
          id="one-page-landscape"
          label={words.twoPage.onePage.label}
          onChecked={(checked) => {
            update('onePageLandscape', checked);
          }}
        />
        <ToggleField
          {...resetProps('invertDirection')}
          checked={settings.invertDirection}
          description={said(locks.twoPageView) ?? words.twoPage.invert.description}
          disabled={locks.twoPageView !== undefined}
          id="invert-direction"
          label={words.twoPage.invert.label}
          onChecked={(checked) => {
            update('invertDirection', checked);
          }}
        />
      </SettingsSection>

      <SettingsSection
        description={words.color.description}
        eyebrow={words.eyebrow.advanced}
        title={words.color.title}
      >
        <SelectField
          {...resetProps('forceColor')}
          description={said(imageLock.colorPages) ?? colorDescription}
          disabled={imageLock.colorPages !== undefined}
          id="color-pages"
          label={words.color.pages.label}
        >
          <NativeSelect
            aria-describedby="color-pages-message"
            disabled={imageLock.colorPages !== undefined}
            id="color-pages"
            onChange={(event) => {
              update('forceColor', event.target.value === 'color');
            }}
            value={settings.forceColor ? 'color' : 'grayscale'}
          >
            <option value="grayscale">{words.color.pages.grayscale}</option>
            <option value="color">{words.color.pages.color}</option>
          </NativeSelect>
        </SelectField>
        <SelectField
          changed={autoContrast !== autoContrastBaseline}
          description={said(locks.autoContrast) ?? words.color.autoContrast.help[autoContrast]}
          disabled={locks.autoContrast !== undefined}
          id="auto-contrast"
          label={words.color.autoContrast.label}
          onReset={() => {
            onSettings(withAutoContrast(settings, autoContrastBaseline));
          }}
          resetsTo={resetsTo}
        >
          <NativeSelect
            aria-describedby="auto-contrast-message"
            disabled={locks.autoContrast !== undefined}
            id="auto-contrast"
            onChange={(event) => {
              onSettings(withAutoContrast(settings, event.target.value as AutoContrastMode));
            }}
            value={autoContrast}
          >
            <option value="monochrome">{words.color.autoContrast.names.monochrome}</option>
            <option value="off">{words.color.autoContrast.names.off}</option>
            <option value="all">{words.color.autoContrast.names.all}</option>
          </NativeSelect>
        </SelectField>
        <ToggleField
          {...resetProps('eraseRainbow')}
          checked={settings.eraseRainbow}
          description={said(imageLock.eraseRainbow) ?? words.color.rainbow.description}
          disabled={imageLock.eraseRainbow !== undefined}
          id="erase-rainbow"
          label={words.color.rainbow.label}
          onChecked={(checked) => {
            update('eraseRainbow', checked);
          }}
        />
        <ToggleField
          {...resetProps('autoLevel')}
          checked={settings.autoLevel}
          description={autolevelReason ?? words.color.autoLevel.description}
          disabled={autolevelReason !== undefined}
          id="auto-level"
          label={words.color.autoLevel.label}
          onChecked={(checked) => {
            update('autoLevel', checked);
          }}
        />
        <NumberField
          {...resetProps('gamma')}
          description={said(imageLock.gamma) ?? words.color.gamma.description}
          disabled={imageLock.gamma !== undefined}
          error={errorFor('gamma')}
          id="gamma"
          label={words.color.gamma.label}
          placeholder={words.color.gamma.placeholder}
          onValue={(value) => {
            update('gamma', value);
          }}
          optional
          step={0.1}
          value={settings.gamma}
        />
      </SettingsSection>

      <SettingsSection
        description={words.images.description}
        eyebrow={words.eyebrow.advanced}
        title={words.images.title}
      >
        <SelectField
          {...resetProps('forcePng')}
          description={said(imageLock.pageFormat) ?? pageFormatDescription}
          disabled={imageLock.pageFormat !== undefined}
          id="page-format"
          label={words.images.format.label}
        >
          <NativeSelect
            aria-describedby="page-format-message"
            disabled={imageLock.pageFormat !== undefined}
            id="page-format"
            onChange={(event) => {
              update('forcePng', event.target.value === 'png');
            }}
            value={settings.forcePng ? 'png' : 'jpeg'}
          >
            <option value="jpeg">{words.images.format.jpeg}</option>
            <option value="png">{words.images.format.png}</option>
          </NativeSelect>
        </SelectField>
        <NumberField
          {...resetProps('jpegQuality')}
          description={
            said(imageLock.jpegQuality) ??
            (jpegUse === 'color-pages'
              ? `${words.images.jpegQuality.forColorPages} ${jpegQualityHint}`
              : jpegUse === 'cover'
                ? `${words.images.jpegQuality.coverOnly} ${jpegQualityHint}`
                : jpegQualityHint)
          }
          disabled={imageLock.jpegQuality !== undefined}
          error={errorFor('jpegQuality')}
          id="jpeg-quality"
          label={words.images.jpegQuality.label}
          max={100}
          min={1}
          placeholder={`${String(jpegQualityDefault)}%`}
          onValue={(value) => {
            update('jpegQuality', value);
          }}
          optional
          value={settings.jpegQuality}
        />
        <ToggleField
          {...resetProps('noQuantize')}
          checked={settings.noQuantize}
          description={said(imageLock.noQuantize) ?? words.images.noQuantize.description}
          disabled={imageLock.noQuantize !== undefined}
          id="no-quantize"
          label={words.images.noQuantize.label}
          onChecked={(checked) => {
            update('noQuantize', checked);
          }}
        />
        <ToggleField
          {...resetProps('pngLegacy')}
          checked={settings.pngLegacy}
          description={said(imageLock.pngLegacy) ?? words.images.pngLegacy.description}
          disabled={imageLock.pngLegacy !== undefined}
          id="png-legacy"
          label={words.images.pngLegacy.label}
          onChecked={(checked) => {
            update('pngLegacy', checked);
          }}
        />
        <ToggleField
          {...resetProps('forcePngRgb')}
          checked={settings.forcePngRgb}
          description={said(imageLock.forcePngRgb) ?? words.images.forcePngRgb.description}
          disabled={imageLock.forcePngRgb !== undefined}
          id="force-png-rgb"
          label={words.images.forcePngRgb.label}
          onChecked={(checked) => {
            update('forcePngRgb', checked);
          }}
        />
      </SettingsSection>

      <SettingsSection
        description={words.cover.description}
        eyebrow={words.eyebrow.advanced}
        title={words.cover.title}
      >
        <ToggleField
          {...resetProps('smartCoverCrop')}
          checked={settings.smartCoverCrop}
          description={said(bookLock.smartCoverCrop) ?? words.cover.smartCrop.description}
          disabled={bookLock.smartCoverCrop !== undefined}
          id="smart-cover-crop"
          label={words.cover.smartCrop.label}
          onChecked={(checked) => {
            update('smartCoverCrop', checked);
          }}
        />
        <ToggleField
          {...resetProps('coverFill')}
          checked={settings.coverFill}
          description={said(bookLock.coverFill) ?? words.cover.fill.description}
          disabled={bookLock.coverFill !== undefined}
          id="cover-fill"
          label={words.cover.fill.label}
          onChecked={(checked) => {
            update('coverFill', checked);
          }}
        />
      </SettingsSection>

      <SettingsSection
        description={words.metadata.description}
        eyebrow={words.eyebrow.advanced}
        title={words.metadata.title}
      >
        <SelectField
          {...resetProps('metadataTitle')}
          description={words.metadata.comicInfoTitle.description}
          id="metadata-title"
          label={words.metadata.comicInfoTitle.label}
        >
          <NativeSelect
            aria-describedby="metadata-title-message"
            id="metadata-title"
            onChange={(event) => {
              update('metadataTitle', event.target.value as MangaprepSettings['metadataTitle']);
            }}
            value={settings.metadataTitle}
          >
            <option value="series-only">
              {words.metadata.comicInfoTitle.names['series-only']}
            </option>
            <option value="combine">{words.metadata.comicInfoTitle.names.combine}</option>
            <option value="title-only">{words.metadata.comicInfoTitle.names['title-only']}</option>
          </NativeSelect>
        </SelectField>
        <TextField
          {...resetProps('language')}
          description={
            format === 'epub' ? words.metadata.language.forEpub : words.metadata.language.stored
          }
          error={errorFor('language')}
          id="language"
          label={words.metadata.language.label}
          onValue={(value) => {
            update('language', value);
          }}
          value={settings.language}
        />
        <ToggleField
          {...resetProps('keepComicInfo')}
          checked={settings.keepComicInfo}
          description={
            format === 'cbz'
              ? words.metadata.keepComicInfo.cbz
              : words.metadata.keepComicInfo.onlyCbz
          }
          disabled={format !== 'cbz'}
          id="keep-comic-info"
          label={words.metadata.keepComicInfo.label}
          onChecked={(checked) => {
            update('keepComicInfo', checked);
          }}
        />
      </SettingsSection>

      <SettingsSection
        description={words.tool.description}
        eyebrow={words.eyebrow.diagnostics}
        title={words.tool.title}
      >
        <ToggleField
          {...resetProps('quiet')}
          checked={settings.quiet}
          description={words.tool.quiet.description}
          id="quiet"
          label={words.tool.quiet.label}
          onChecked={(checked) => {
            update('quiet', checked);
          }}
        />
      </SettingsSection>
    </div>
  );
}

/**
 * Tells each choice (a checkbox) whether the field it shares a row with, in two columns, has a label
 * above its control: then it is put in line with that control (`CheckRow`). The fields of a section
 * are two to a row, in order, and none of them spans both columns.
 */
function besideTheirFields(children: ReactNode): ReactNode[] {
  const fields = Children.toArray(children);
  return fields.map((field, index) => {
    if (!isValidElement(field) || field.type !== ToggleField) return field;
    const mate = fields[index % 2 === 0 ? index + 1 : index - 1];
    const besideField = isValidElement(mate) && mate.type !== ToggleField;
    return besideField
      ? cloneElement(field as ReactElement<{ besideField?: boolean }>, { besideField })
      : field;
  });
}

function SettingsSection({
  children,
  description,
  eyebrow,
  title,
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly eyebrow: string;
  readonly title: string;
}): React.JSX.Element {
  return (
    <section className="border-border bg-surface rounded-xl border p-6">
      <div className="mb-5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-1 text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{besideTheirFields(children)}</div>
    </section>
  );
}

interface ResettableFieldProps {
  readonly changed: boolean;
  readonly onReset: () => void;
  /** What the reset puts back; the app's default unless it is the queue's options (one item). */
  readonly resetsTo?: 'default' | 'queue' | undefined;
}

function SelectField({
  changed,
  children,
  description,
  disabled,
  error,
  id,
  label,
  onReset,
  resetsTo,
}: ResettableFieldProps & {
  readonly children: ReactNode;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly id: string;
  readonly label: string;
}): React.JSX.Element {
  return (
    <Field
      changed={changed}
      description={description}
      disabled={disabled}
      error={error}
      id={id}
      label={label}
      onReset={onReset}
      resetsTo={resetsTo}
    >
      {children}
    </Field>
  );
}

function TextField({
  changed,
  description,
  error,
  id,
  label,
  onValue,
  onReset,
  placeholder,
  resetsTo,
  value,
}: ResettableFieldProps & {
  readonly description?: string;
  readonly error?: string;
  readonly id: string;
  readonly label: string;
  readonly onValue: (value: string) => void;
  readonly placeholder?: string;
  readonly value: string;
}): React.JSX.Element {
  return (
    <Field
      changed={changed}
      description={description}
      error={error}
      id={id}
      label={label}
      onReset={onReset}
      resetsTo={resetsTo}
    >
      <Input
        aria-describedby={
          description === undefined && error === undefined ? undefined : `${id}-message`
        }
        aria-invalid={error === undefined ? undefined : true}
        id={id}
        onChange={(event) => {
          onValue(event.target.value);
        }}
        placeholder={placeholder}
        value={value}
      />
    </Field>
  );
}

function NumberField({
  changed,
  description,
  disabled,
  error,
  id,
  label,
  max,
  min,
  onValue,
  onReset,
  optional = false,
  placeholder,
  resetsTo,
  step = 1,
  value,
}: ResettableFieldProps & {
  readonly description?: string;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly id: string;
  readonly label: string;
  readonly max?: number;
  readonly min?: number;
  readonly onValue: (value: number | undefined) => void;
  readonly optional?: boolean;
  readonly placeholder?: string;
  readonly step?: number;
  readonly value: number | undefined;
}): React.JSX.Element {
  // What is being typed, until the field is left. A required option keeps its last valid number
  // while the field is empty, and showing that number again under the cursor made a new one
  // typed after clearing the field come out as "12" for "2".
  const [typed, setTyped] = useState<string>();
  return (
    <Field
      changed={changed}
      description={description}
      error={error}
      id={id}
      label={label}
      onReset={onReset}
      optional={optional}
      resetsTo={resetsTo}
    >
      <Input
        aria-describedby={
          description === undefined && error === undefined ? undefined : `${id}-message`
        }
        aria-invalid={error === undefined ? undefined : true}
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        onBlur={() => {
          setTyped(undefined);
        }}
        onChange={(event) => {
          const raw = event.target.value;
          setTyped(raw);
          if (raw === '') {
            if (optional) onValue(undefined);
            return;
          }
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) onValue(parsed);
        }}
        placeholder={placeholder}
        step={step}
        type="number"
        value={typed ?? value ?? ''}
      />
    </Field>
  );
}

function ToggleField({
  besideField = false,
  changed,
  checked,
  description,
  disabled,
  id,
  label,
  onChecked,
  onReset,
  resetsTo,
}: ResettableFieldProps & {
  /** Set by its section when the field next to it has a label above its control (see `CheckRow`). */
  readonly besideField?: boolean;
  readonly checked: boolean;
  readonly description: string;
  readonly disabled?: boolean;
  readonly id: string;
  readonly label: string;
  readonly onChecked: (checked: boolean) => void;
}): React.JSX.Element {
  return (
    <CheckRow
      besideField={besideField}
      checked={checked}
      describedBy={`${id}-message`}
      disabled={disabled}
      id={id}
      note={<Note id={`${id}-message`}>{description}</Note>}
      onChange={onChecked}
      title={
        <SettingFieldHeader
          changed={changed}
          disabled={disabled}
          id={id}
          label={label}
          onReset={onReset}
          resetsTo={resetsTo}
        />
      }
    />
  );
}
