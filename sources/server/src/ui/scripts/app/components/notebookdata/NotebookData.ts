/*
 * Copyright 2014 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */


/**
 * Directive for creating a single editor cell
 *
 * The input region provides and editable text region. The output region appears if there is any
 * output content, and disappears is the output content is falsey (undefined/null/empty).
 */
/// <reference path="../../../../../../../../externs/ts/angularjs/angular.d.ts" />
import logging = require('app/common/Logging');
import constants = require('app/common/Constants');
import _app = require('app/App');
import actions = require('app/shared/actions');
import updates = require('app/shared/updates');

var log = logging.getLogger(constants.scopes.notebookData);

/**
 * An instance of this class manages a single notebook's data, client-side. Handles updating the
 * notebook data model whenever update events are published from the notebook server.
 *
 * It should be considered a read-only view of the authoritative notebook data stored on the
 * server. Any local modifications to the notebook model should be predictive of eminent updates
 * that will be published from the server and should never corrupt the notebook state such that
 * a notebook data update cannot cause the client-side and server-side notebook data models
 * to diverge.
 *
 * For example, if the user inserts a new cell within a notebook worksheet, a "new cell action"
 * is sent to the server, and a corresponding update broadcast to all clients. The client that
 * performed the cell insert action should ideally see the new cell appear immediately (responsive)
 * but appending the cell locally, rather than waiting for the server to broadcast the update, has
 * the danger of causing local and server states to diverge. Thus, any local modifications to the
 * notebook model for responsiveness purposes need to be handled with great caution.
 */
class NotebookData implements app.INotebookData {

  activeWorksheet: app.notebook.Worksheet;
  notebook: app.notebook.Notebook;

  _rootScope: ng.IRootScopeService;
  _sce: ng.ISCEService;

  // Mimetype preference order used by IPython
  static _preferredMimetypes = [
    'application/javascript',
    'text/html',
    'text/markdown',
    'text/latex',
    'image/svg+xml',
    'image/png',
    'image/jpeg',
    'application/pdf',
    'text/plain'];

  static $inject = ['$rootScope', '$sce'];
  constructor (rootScope: ng.IRootScopeService, sce: ng.ISCEService) {
    this._rootScope = rootScope;
    this._sce = sce;

    // FIXME: move event name strings to constants file
    // FIXME: clean this up, possible to simplify the nesting?
    var callback: Function = this._setNotebook.bind(this);
    rootScope.$on(updates.notebook.snapshot, (event: any, snapshot: any) => {
      rootScope.$evalAsync(() => { callback(snapshot) });
    });

    // rootScope.$on(actions.cell.execute, this._handleExecuteCellEvent.bind(this));
  }

  // TODO(bryantd): decide if we want a local "predictive modification" for the various insert functions
  // to make the UI more responsive given the latency in getting back a server response with the
  // inserted cell.

  insertMarkdownCell () {
    console.debug('insert markdown cell()');
  }

  insertCodeCell () {
    console.debug('insert code cell()');
  }

  insertHeadingCell () {
    console.debug('insert heading cell()');
  }

  selectWorksheet (worksheetId: string) {
    var worksheet = this.notebook.worksheets[worksheetId];
    if (!worksheet) {
      // TODO(bryantd): worksheet by given id is not loaded. request the worksheet from the server
      throw new Error('Attempted to select non-existent worksheet id: '+ worksheetId);
    }
    this.activeWorksheet = worksheet;
  }

  /**
   * Overwrites the notebook state with the given notebook snapshot
   *
   * Also sets the first worksheet to be active
   */
  _setNotebook(snapshot: app.notebook.update.Snapshot) {
    log.debug('setting notebook to snapshot value');

    // Snapshots are used to fully init/overwrite the client-side notebook state
    this.notebook = snapshot.notebook;

    // Makes the first worksheet active, if it exists
    if (this.notebook.worksheetIds.length > 0) {
      this.selectWorksheet(this.notebook.worksheetIds[0]);
    } else {
      log.error('Notebook snapshot update contains zero worksheets! snapshot:', snapshot);
    }
  }


// FIXME: get basic wiring for new ws protocol and then pull the following bits back
// into the client/server side update pieces

//   // FIXME: eventually this will accept (one or more) deltas
//   // but it will be the full notebook for now
//   _updateNotebook (event: any, newNotebook: app.notebook.Notebook) {
//     log.debug('New notebook snapshot received (via websocket)', newNotebook);

//     if (!newNotebook) {
//       log.debug('Unable to update notebook with a false-y notebook data model. Ignoring...');
//       return; // FIXME: better handling of this case
//     }

//     this._selectNotebookOutputMimetypes(newNotebook)

//     if (this.notebook) {
//       this._mergeNotebook(newNotebook);
//     } else {
//       this.notebook = newNotebook;
//     }
//   }

//   // FIXME: this method will change substantially or be replaced in full once notebook values
//   // are being broadcasted rather than the full notebook
//   _mergeNotebook (newNotebook: app.notebook.Notebook) {
//     console.error('Not merging notebook update.. TODO'); // FIXME
//     /*

//     var that = this;

//     Object.keys(newNotebook.cells).forEach((cellId: string) => {
//       var currentCell = that.notebook.cells[cellId];
//       var newCell = newNotebook.cells[cellId];
//       if (currentCell) { // FIXME: doesn't look like cellIndex is used below... remove this?
//         var cellIndex = that.notebook.worksheet.indexOf(currentCell.id);
//       }

//       // TODO(bryantd): Logic for merging worksheet order needs to be implemented here eventually
//       // Side-stepping issue at the moment because the worksheet is append-only currently
//       var isActive = false;
//       if (!currentCell) { // New cell received push it to tail of worksheet
//         that.notebook.worksheet.push(cellId);
//       } else {
//         // If this cell is currently active, keep it active
//         isActive = that.notebook.cells[cellId].active;
//       }

//       // Overwrite individual cells as they are broadcast from server
//       // TODO(bryantd): currently only overwrite code cells, since only those are being persisted
//       // to the server. Overwriting markdown cells will cause the contents to be erased since markdown
//       // cells are not "saved" to the server (yet)
//       if (newNotebook.cells[cellId].type == 'code') {
//         that.notebook.cells[cellId] = newNotebook.cells[cellId];
//       }


//       // FIXME: consider here all of the client-side modifications to a cell
//       // that might be blown away on update. Currently just concerned with cell.active flag
//       //
//       // Seems like there is a set of user-specific settings/state (e.g., cursor, active part of the page)
//       // that shouldn't be broadcasted/shared with all users
//       //
//       // Or maybe we should broadcast/persist these things, they just need to be
//       // marked as owned by user X (like realtime api)
//       //
//       // Leaning towards publishing the entirety of the state to the server
//       // because managing some local dirty state that needs re-application feels fragile
//       // and will eventually go away once we have multi-user working.
//       //
//       // Publishing the full state to the server for generating the ui-side view has the downside
//       // of adding more details to the content update message protocol between ui/server, but has
//       // the advantage of moving *all* notebook state server-side, simplifying the ui-side code

//       // Re-mark the cell as active if it was active before the update
//       if (isActive) {
//         that.notebook.cells[cellId].active = isActive
//       }

//     });
//   */
//   }

//   /**
//    * Selects a mimetype for the cell output out of possibilities within mimetype bundle
//    */
//   _selectMimetype (output: app.notebook.AugmentedCellOutput) {
//     var bundle = output.mimetypeBundle;
//     if (!bundle) {
//       log.warn('Received an output with no mimetype bundle: ', output);
//       return;
//     }
//     output.preferredMimetype = this._findPreferredMimetype(bundle);

//     // Bail if there isn't a preferred mimetype within the bundle
//     if (!output.preferredMimetype) {
//       log.warn('Unable to select a mimetype for cell output: ', output);
//       return;
//     }

//     // Create a trusted html wrapper for the html content so that it is display-able
//     if (output.preferredMimetype == 'text/html') {
//       output.trustedHtml = this._sce.trustAsHtml(bundle['text/html']);
//     }
//   }

//   /**
//    * Select mimetypes for all cell outputs within the given notebook
//    */
//   _selectNotebookOutputMimetypes (notebook: app.notebook.Notebook) {
//     /* FIXME: this method needs information about which worksheet was modified to avoid iterating over all worksheets
//     Will change slightly under the new delta model

//     // Iterate through the cells
//     Object.keys(notebook.cells).forEach((cellId) => {
//       var cell = notebook.cells[cellId];
//       if (cell.outputs) {
//         // Iterate through each cell's output and select a mimetype (one per output)
//         cell.outputs.forEach(this._selectMimetype.bind(this));
//       }
//     });
//   */
//   }

//   *
//    * Finds the preferred mimetype from the options available in a given mimetype bundle.
//    *
//    * The preferred mimetype for displaying a given output is modeled on IPython's preference list.
//    *
//    * Returns null if none of the preferred mimetypes are available within the bundle.

//   _findPreferredMimetype (mimetypeBundle: app.Map<string>) {
//     for (var i = 0; i < NotebookData._preferredMimetypes.length; ++i) {
//       var mimetype = NotebookData._preferredMimetypes[i];
//       if (mimetypeBundle.hasOwnProperty(mimetype)) {
//         return mimetype;
//       }
//     }
//     return null;
//   }



// ///// FIXME: The following section should likely remain here or be moved to notebook directive
// ///// Everything around focusing/activating cells is purely client-side and does not effect the
// ///// notebook in a persistent way. As such, could make more sense in directive.
// /////
// ///// Still need a hook here for appending a blank cell (of default type)
// /////
// ///// Everything below needs to be worksheet-scope as well

//   /**
//    * Updates the currently active cell whenever a given cell is executed
//    *
//    * Whenever a cell is executed, the subsequent cell will be made active. If the executed cell
//    * is at the tail of the worksheet, a blank cell is appended and then made active.
//    *
//    * This behavior is consistent with IPython's and has the property of making it easy to execute
//    * a contiguous group of cells without requiring the user to manually focus each cell.
//    */
//   _handleExecuteCellEvent (event: any, cell: app.notebook.Cell) {
//     log.debug('[nb] cell.execute event for cell: ', cell);
//     // Find the current index of the cell in the worksheet
//     var currentIndex = this.notebook.worksheet.indexOf(cell.id);
//     if (currentIndex === -1) {
//       log.error('Attempted to insert a cell based upon a non-existent cell id');
//     }

//     var nextIndex = currentIndex + 1;
//     log.debug('setting active cell to index ' + nextIndex);
//     if (nextIndex < this.notebook.worksheet.length) {
//       // There's already a cell at the next index, make it active
//       log.debug('found an existing cell to make active');
//       this._makeCellActive(this._getCellByIndex(nextIndex));
//     } else {
//       // Otherwise, append blank cell
//       log.debug('creating a blank cell to append');
//       var newCell = this._insertBlankCell(nextIndex);
//       this._makeCellActive(newCell);
//     }
//   }

//   /**
//    * Look up a notebook cell by its index within the worksheet
//    */
//   _getCellByIndex (index: number) {
//     var cellId = this.notebook.worksheet[index];
//     return this.notebook.cells[cellId];
//   }

//   /**
//    * Programmatically focus a given cell by making it active
//    */
//   _makeCellActive (cell: app.notebook.Cell) {
//     this._rootScope.$evalAsync(() => {
//       cell.active = true;
//     });
//   }



// /////////// Below methods should issue a server ws request for the operations instead
// /// of simply applying them to the local notebook mode

// /*
//   _appendMarkdownCell () {
//     var id = this._generateUUID();
//     if (!this.notebook.cells[id]) { // only insert the cell once
//       this.notebook.cells[id] = {
//         id: id,
//         type: 'markdown',
//         source: '',
//         active: true
//       }
//       this.notebook.worksheet.push(id);
//     }
//   }

//   _appendCodeCell () {
//     var id = this._generateUUID();
//     if (!this.notebook.cells[id]) { // only insert the cell once
//       this.notebook.cells[id] = {
//         id: id,
//         type: 'code',
//         source: '',
//         active: true
//       }
//       this.notebook.worksheet.push(id);
//     }
//   }

//   _appendHeadingCell () {
//     var id = this._generateUUID();
//     if (!this.notebook.cells[id]) { // only insert the cell once
//       this.notebook.cells[id] = {
//         id: id,
//         type: 'heading',
//         source: '',
//         active: true,
//         metadata: {
//           // TODO(bryantd): implement a level selector UI element for configuring this attribute
//           level: 1
//         }
//       }
//       this.notebook.worksheet.push(id);
//     }
//   }

//   // Called as a side-effect of executing the notebook's tail cell
//   _insertBlankCell (index: number) {
//     var newCell = this._createBlankCell();
//     this.notebook.worksheet.push(newCell.id);
//     this.notebook.cells[newCell.id] = newCell;
//     return newCell;
//   }
//   // FIXME: Mostly a dupe of the insertCodeCell content
//   _createBlankCell () {
//     return {
//       id: this._generateUUID(),
//       type: 'code', // FIXME: default cell type move to constant
//       executionCounter: '-', // FIXME CONSTANT (needs to be a nbsp, but that requires html trusting too), fix this
//       source: '' // a blank line
//     }
//   }

// // FIXME: If all notebook modifications are handled server-side, can probably relocate/remove this
//   _insertCell (cell: any, index: number) {
//     this.notebook.worksheet.splice(index, 0, cell);
//   }


// ///// FIXME Might be able to get rid of this or relocate to utils

// */

}

_app.registrar.service(constants.notebookData.name, NotebookData);
log.debug('Registered notebook data service');