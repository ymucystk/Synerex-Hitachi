import * as React from 'react';
import Chart from 'chart.js/auto';

interface Props {
  id?: string,
  chartData?: any
}
Chart.defaults.color = '#fff';
export default class ChartComponent extends React.Component<Props> {
  render() {
    if(this.props.chartData !== undefined && Object.keys(this.props.chartData).length > 0){
      return (<_ChartComponent {...this.props} />);
    }else{
      return (null);
    }
  }
}

class _ChartComponent extends React.Component<Props> {
  canvas: HTMLCanvasElement;
  chart: Chart;

  constructor(props:Props){
    super(props)
    this.canvas = undefined
    this.chart = undefined
  }

  componentDidMount() {
      const context = this.canvas.getContext('2d');
      this.chart = new Chart(context, this.props.chartData);
  }

  componentDidUpdate(prevProps: Props){
    if(prevProps.chartData !== this.props.chartData){
      if(this.chart === undefined){
        const context = this.canvas.getContext('2d');
        this.chart = new Chart(context, this.props.chartData);
      }else{
        this.chart.data.datasets = this.props.chartData.data.datasets
        this.chart.data.labels = this.props.chartData.data.labels
        this.chart.options = this.props.chartData.options
        this.chart.update()
      }
    }
  }

  render() {
    return (<canvas id={this.props.id} ref={(canvas)=>{this.canvas = canvas;}} />);
  }
}
