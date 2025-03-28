import { boot } from 'quasar/wrappers';
import BytetradeUi, { BtNotify, BtDialog } from '@bytetrade/ui';
import { Notify, Dialog } from 'quasar';
import CustomDialog from 'components/base/dialog/index'
import CustomMenu from 'components/base/Menu/index'
import CustomTheme from 'components/base/theme/index'

export default boot(async ({ app }) => {
	app.use(BytetradeUi);
  CustomDialog(app,{
    defaultOkClass: 'launcher-global-ok-button'
  })
  CustomMenu(app);
  CustomTheme(app);
	BtNotify.init(Notify);
	BtDialog.init(Dialog);
});
