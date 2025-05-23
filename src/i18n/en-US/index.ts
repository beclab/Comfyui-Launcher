export default {
  base: {
    comfyui: 'ComfyUI',
    missing: 'Missing',
    intact: 'Intact',
    folder: 'Folder',
    network: 'Network',
    resource_pack: 'Resource Pack',
    installed: 'Installed',
    download: 'Download',
    start: 'start',
    open: 'open',
    stop: 'stop',
    view_log: 'View log',
    erase_and_restore: 'Erase and Restore',
    running: 'running',
    stopped: 'stopped',
    startup_error: 'ComfyUI startup error.. ',
    click_to_view: 'Click to view the log.',
    confirm: 'Confirm',
    cancel: 'Cancel',
    test: 'Test',
    unknown: 'Unknown'
  },
  network: {
    working: 'Working',
    timeout: 'Timeout',
    testing: 'Testing',
    choose_a_base_url: 'Choose a base URL'
  },
  menu: {
    navigation_menu: 'Navigation Menu',
    home: 'Home',
    model_management: 'Models',
    environment_management: 'Environment',
    plugin_management: 'Plugins',
    network_configuration: 'Network',
    inspiration_discovery: 'Discovery',
  },
  package: {
    essential: 'Essential',
    essential_models_pack: 'Essential Models Pack',
    essential_models_pack_desc:
      'Includes the essential models for commonly used ComfyUI workflows.',
    controlNet_models_pack: 'ControlNet Models Pack',
    controlNet_models_pack_desc: 'Includes the models for ControlNet Plugin.',
  },
  dialog: {
    comfyui_log: 'ComfyUl 日志',
    essential_models_missing: 'Essential Models Missing',
    essential_models_missing_desc:
      'Some of the essential models are missing. ComfyUI may not generate images correctly. Would you like to continue with the startup?',
    remember_choice:
      'Remember my choice and skip this confirmation in the future',
    start_anyway: 'Start Anyway',
    download_models: 'Download Models',
    erase_and_restore_title: 'Confirm Erase and Restore',
    erase_and_restore_desc:
      'Are you sure you want to restore ComfyUI? It will:',
    erase_and_restore_point1: 'Erase all user settings',
    erase_and_restore_point2: 'Remove all installed plugins',
    erase_and_restore_point3: 'Reset all workflows and projects',
    erase_and_restore_point4: 'But downloaded models will remain intact.',
    erase_and_restore_confirm: 'Erase and Restore',
    irreversible_warning_title: 'Confirm Erase and Restore',
    irreversible_warning_desc:
      "This operation is irreversible. If you do want to proceed, please type CONFIRM below. If you're only experiencing a temporary issue, please consider restarting ComfyUI instead of restoring.",
    confirm_placeholder: "Please type 'CONFIRM' to proceed this operation.",
  },
};
