import * as React from 'react';
import { xml2js } from 'xml-js';

interface Props {
  actions: any,
  getOsmData: any,
  id?: string,
  className?: string,
  style?: React.CSSProperties
}

export default class OsmInput extends React.Component<Props> {
  static defaultProps = {}

  onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const { actions, getOsmData } = this.props;
    const reader = new FileReader();
    reader.addEventListener('load', parseXML, false);
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    reader.readAsText(file);
    const file_name: string = file.name;
    function parseXML(e: ProgressEvent<FileReader>){
        const xml = e.target.result as string;
        const readdata = xml2js(xml,{compact: true}) as {osm?:any};
        if(readdata.osm.way && readdata.osm.node){
            const {way,node} = readdata.osm;
            getOsmData(Object.assign({},{way,node}));
            actions.setInputFilename({ osmDataFileName: file_name });
        }else{
            window.alert('OSM DATA FAIL');
            getOsmData({});
            actions.setInputFilename({ osmDataFileName: null });
        }
    }
  }

  onClick(e: any) {
    const { getOsmData, actions } = this.props;
    getOsmData({});
    actions.setInputFilename({ osmDataFileName: null });
    e.target.value = '';
  }

  render() {
    const { id, className, style } = this.props;

    return (
      <input type="file" accept=".osm"
      id={id} className={className} style={style}
      onClick={this.onClick.bind(this)}
      onChange={this.onSelect.bind(this)}
      />
    );
  }
}
