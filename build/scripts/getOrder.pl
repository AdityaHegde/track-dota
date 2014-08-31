my $page = $ARGV[0];
my $regex = $ARGV[1];

$page = `cat $page`;

my @files = ($page =~ /$regex/gm);

print "@files\n";
