my @allfiles;
my @dirs;
my $choice = shift @ARGV;
my $i = 0;

for my $dir (@ARGV) {
  my @files = glob "$dir/*";
  while($i < scalar @files) {
    if(-d $files[$i]) {
      push @files, glob $files[$i]."/*";
      push @dirs, splice @files, $i, 1;
    }
    else {
      $i++;
    }
  }
  push @allfiles, @files;
}

if($choice eq "files") {
  print "@allfiles\n";
}
else {
  print "@dirs\n";
}
