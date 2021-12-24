import * as React from 'react';
import { Actions, Movesbase } from 'harmoware-vis';
const {isArray} = Array;

interface Props {
  actions: typeof Actions,
  movesBaseLoad: Function,
  id?: string,
  className?: string,
  style?: React.CSSProperties
}

export default class MovesInput extends React.Component<Props> {

  onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const { actions } = this.props;
    const reader = new FileReader();
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    actions.setLoading(true);
    this.props.movesBaseLoad([])
    reader.readAsText(file);
    const file_name: string = file.name;
    reader.onload = () => {
      let readdata: Movesbase[] = null;
      try {
        readdata = JSON.parse(reader.result.toString());
      } catch (exception) {
        actions.setLoading(false);
        window.alert(exception);
        return;
      }
      actions.setInputFilename({ movesFileName: file_name });
      this.props.movesBaseLoad(readdata)
      actions.setRoutePaths([]);
      actions.setClicked(null);
      actions.setAnimatePause(false);
      actions.setAnimateReverse(false);
      actions.setLoading(false);
    };
  }

  onClick(e: any) {
    const { actions } = this.props;
    actions.setInputFilename({ movesFileName: null });
    this.props.movesBaseLoad([])
    e.target.value = '';
  }

  render() {
    const { id, className, style } = this.props;

    return (
      <input type="file" accept=".json"
      id={id} className={className} style={style}
      onClick={this.onClick.bind(this)}
      onChange={this.onSelect.bind(this)}
      />
    );
  }
}
